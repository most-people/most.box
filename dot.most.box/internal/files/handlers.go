// Package files 提供基于 IPFS 的文件管理相关接口。
package files

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"path"
	"strings"

	"dotmostbox/internal/mp"

	cidlib "github.com/ipfs/go-cid"
	shell "github.com/ipfs/go-ipfs-api"
)

var systemDir = map[string]struct{}{".note": {}} // 系统目录白名单

// Register 注册文件相关路由（列表、删除、上传、重命名、导入）。
func Register(mux *http.ServeMux, sh *shell.Shell) {
	// 获取文件 CID
	mux.HandleFunc("/files.cid/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/files.cid/"), "/")
		if len(parts) < 3 {
			io.WriteString(w, "")
			return
		}
		userId, directory, fileName := parts[0], parts[1], parts[2]
		if _, ok := systemDir[directory]; !ok || fileName == "" {
			io.WriteString(w, "")
			return
		}
		fullPath := path.Join("/", strings.ToLower(userId), directory, fileName)
		var statInfo map[string]any
		if err := sh.Request("files/stat", fullPath).Exec(context.Background(), &statInfo); err != nil {
			io.WriteString(w, "")
			return
		}
		cid := cidString(statInfo["Hash"]) // kubo returns v1
		io.WriteString(w, cid)
	})

	// 获取用户根目录 CID
	mux.HandleFunc("/files.root.cid", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}
		fullPath := path.Join("/", strings.ToLower(address))
		var statInfo map[string]any
		if err := sh.Request("files/stat", fullPath).Exec(context.Background(), &statInfo); err != nil {
			io.WriteString(w, "")
			return
		}
		cid := cidString(statInfo["Hash"]) // kubo returns v1
		io.WriteString(w, cid)
	})

	// 获取文件列表
	mux.HandleFunc("/files.get", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}
		subPath := r.URL.Query().Get("path")
		fullPath := "/" + address
		if subPath != "" {
			fullPath = path.Join(fullPath, subPath)
		}
		requestBuilder := sh.Request("files/ls", fullPath).Option("long", true)
		var listResult map[string]any
		if err := requestBuilder.Exec(context.Background(), &listResult); err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "file does not exist") {
				w.Header().Set("Content-Type", "application/json")
				io.WriteString(w, "[]")
				return
			}
			http.Error(w, "文件列表获取失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		entries, _ := listResult["Entries"].([]any)
		// 转换为预期结构：{name, type, size, cid:{"/": CIDv1}}
		out := make([]map[string]any, 0, len(entries))
		for _, e := range entries {
			if m, ok := e.(map[string]any); ok {
				name, _ := m["Name"].(string)
				// 简化 Type 与 Size 归一化
				t := "file"
				if v, ok := m["Type"].(float64); ok && v == 1 {
					t = "directory"
				}
				size := int64(0)
				if s, ok := m["Size"].(float64); ok {
					size = int64(s)
				}
				out = append(out, map[string]any{
					"name": name,
					"type": t,
					"size": size,
					"cid":  map[string]any{"/": cidString(m["Hash"])},
				})
			}
		}
		b, _ := json.Marshal(out)
		w.Header().Set("Content-Type", "application/json")
		w.Write(b)

	})

	// 删除文件或目录
	mux.HandleFunc("/files.delete", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}
		subPath := r.URL.Query().Get("path")
		if subPath == "" {
			http.Error(w, "文件不能为空", http.StatusBadRequest)
			return
		}
		fullPath := "/" + address
		if subPath != "" {
			fullPath = path.Join(fullPath, subPath)
		}
		requestBuilder := sh.Request("files/rm", fullPath).Option("recursive", true)
		response, err := requestBuilder.Send(context.Background())
		if err != nil {
			http.Error(w, "文件删除失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer response.Close()
		if response.Error != nil {
			http.Error(w, "文件删除失败 "+response.Error.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "删除成功"})
	})

	// 上传文件
	mux.HandleFunc("/files.upload", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}
		if err := r.ParseMultipartForm(200 * 1024 * 1024); err != nil {
			http.Error(w, "没有文件", http.StatusBadRequest)
			return
		}
		file, fileHeader, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "没有文件", http.StatusBadRequest)
			return
		}
		defer file.Close()
		data, _ := io.ReadAll(file)
		pathField := r.FormValue("path")
		fileName := pathField
		if fileName == "" {
			fileName = fileHeader.Filename
		}
		if fileName == "" {
			fileName = "unnamed"
		}
		targetPath := path.Join("/", address, fileName)

		cid, err := sh.Add(bytes.NewReader(data), shell.CidVersion(1), shell.RawLeaves(true))
		if err != nil {
			http.Error(w, "文件上传失败 "+err.Error(), http.StatusInternalServerError)
			return
		}

		var existingStat map[string]any
		if err := sh.Request("files/stat", targetPath).Exec(context.Background(), &existingStat); err == nil {
			requestBuilder := sh.Request("files/rm", targetPath)
			if response, sendErr := requestBuilder.Send(context.Background()); sendErr == nil {
				defer response.Close()
				_ = response.Error
			}
		}
		requestBuilder := sh.Request("files/cp", "/ipfs/"+cid, targetPath).Option("parents", true)
		response, sendErr := requestBuilder.Send(context.Background())
		if sendErr != nil {
			http.Error(w, "文件上传失败 "+sendErr.Error(), http.StatusInternalServerError)
			return
		}
		defer response.Close()
		if response.Error != nil {
			http.Error(w, "文件上传失败 "+response.Error.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "message": "上传成功", "filename": fileName, "cid": cid, "size": len(data),
		})
	})

	// 重命名文件或目录
	mux.HandleFunc("/files.rename", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}
		var body struct {
			OldName string `json:"oldName"`
			NewName string `json:"newName"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "缺少文件名参数", http.StatusBadRequest)
			return
		}
		if body.OldName == "" || body.NewName == "" {
			http.Error(w, "缺少文件名参数", http.StatusBadRequest)
			return
		}
		if body.OldName == body.NewName {
			http.Error(w, "新文件名与原文件名相同", http.StatusBadRequest)
			return
		}
		oldPath := path.Join("/", address, strings.TrimPrefix(body.OldName, "/"))
		newPath := path.Join("/", address, strings.TrimPrefix(body.NewName, "/"))
		var statInfo map[string]any
		if err := sh.Request("files/stat", oldPath).Exec(context.Background(), &statInfo); err != nil {
			http.Error(w, "原文件不存在", http.StatusNotFound)
			return
		}
		if err := sh.Request("files/stat", newPath).Exec(context.Background(), &statInfo); err == nil {
			http.Error(w, "新文件名已存在", http.StatusConflict)
			return
		}
		requestBuilder := sh.Request("files/mv", oldPath, newPath)
		response, err := requestBuilder.Send(context.Background())
		if err != nil {
			http.Error(w, "重命名失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer response.Close()
		if response.Error != nil {
			http.Error(w, "重命名失败 "+response.Error.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "重命名成功", "oldName": body.OldName, "newName": body.NewName})
	})

	// 导入文件或目录
	mux.HandleFunc("/files.import", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}
		cid := r.URL.Query().Get("cid")
		if cid == "" {
			http.Error(w, "缺少 cid 参数", http.StatusBadRequest)
			return
		}
		requestBuilder := sh.Request("files/rm", path.Join("/", address)).Option("recursive", true).Option("force", true)
		if response, err := requestBuilder.Send(context.Background()); err == nil {
			defer response.Close()
			_ = response.Error
		}
		if err := sh.FilesCp(context.Background(), "/ipfs/"+cid, path.Join("/", address)); err != nil {
			http.Error(w, "导入失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "导入成功", "cid": cid})
	})
}

// cidString 提取并归一化 CID，统一输出为 CIDv1（base32）。
func cidString(cidField any) string {
	switch value := cidField.(type) {
	case string:
		if value == "" {
			return ""
		}
		if c, err := cidlib.Parse(value); err == nil {
			// Convert to CIDv1 using existing codec and multihash
			v1 := cidlib.NewCidV1(c.Type(), c.Hash())
			return v1.String()
		}
		return value
	case map[string]any:
		if stringValue, ok := value["/"].(string); ok {
			if stringValue == "" {
				return ""
			}
			if c, err := cidlib.Parse(stringValue); err == nil {
				// Convert to CIDv1 using existing codec and multihash
				v1 := cidlib.NewCidV1(c.Type(), c.Hash())
				return v1.String()
			}
			return stringValue
		}
	}
	return ""
}
