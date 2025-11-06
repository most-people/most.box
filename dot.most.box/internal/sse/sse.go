package sse

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type client struct {
	id string
	w  http.ResponseWriter
	fl http.Flusher
}

var (
	roomsMu sync.Mutex
	rooms   = map[string]map[*client]struct{}{}
)

func Register(mux *http.ServeMux) {
	mux.HandleFunc("/sse.signaling", subscribe)
	mux.HandleFunc("/api.room", getRoom)
	mux.HandleFunc("/api.signaling", postSignal)
}

func subscribe(w http.ResponseWriter, r *http.Request) {
	roomId := r.URL.Query().Get("roomId")
	clientId := r.URL.Query().Get("clientId")
	if roomId == "" || clientId == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "roomId 和 clientId 必填"})
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	fl, _ := w.(http.Flusher)
	fl.Flush()

	c := &client{id: clientId, w: w, fl: fl}
	addClient(roomId, c)
	sendJSON(c, map[string]any{"type": "hello", "roomId": roomId, "clientId": clientId, "ts": time.Now().UnixMilli()})
	broadcast(roomId, map[string]any{"type": "join", "clientId": clientId, "ts": time.Now().UnixMilli()}, clientId, "")

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	done := r.Context().Done()
	for {
		select {
		case <-ticker.C:
			_, _ = w.Write([]byte(": ping " + strconv.FormatInt(time.Now().UnixMilli(), 10) + "\n\n"))
			fl.Flush()
		case <-done:
			removeClient(roomId, c)
			broadcast(roomId, map[string]any{"type": "leave", "clientId": clientId, "ts": time.Now().UnixMilli()}, clientId, "")
			return
		}
	}
}

func getRoom(w http.ResponseWriter, r *http.Request) {
	roomId := r.URL.Query().Get("roomId")
	if roomId == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "roomId 必填"})
		return
	}
	roomsMu.Lock()
	set := rooms[roomId]
	users := make([]string, 0)
	for c := range set {
		users = append(users, c.id)
	}
	roomsMu.Unlock()
	json.NewEncoder(w).Encode(map[string]any{"ok": true, "users": users})
}

func postSignal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RoomId, From, To, Type string
		Payload                any
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "roomId, from, type 必填"})
		return
	}
	if body.RoomId == "" || body.From == "" || body.Type == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "roomId, from, type 必填"})
		return
	}
	delivered := broadcast(body.RoomId, map[string]any{"from": body.From, "type": body.Type, "payload": body.Payload, "ts": time.Now().UnixMilli()}, body.From, body.To)
	json.NewEncoder(w).Encode(map[string]any{"ok": true, "delivered": delivered})
}

func addClient(roomId string, c *client) {
	roomsMu.Lock()
	defer roomsMu.Unlock()
	set := rooms[roomId]
	if set == nil {
		set = map[*client]struct{}{}
		rooms[roomId] = set
	}
	set[c] = struct{}{}
}

func removeClient(roomId string, c *client) {
	roomsMu.Lock()
	defer roomsMu.Unlock()
	set := rooms[roomId]
	if set == nil {
		return
	}
	delete(set, c)
	if len(set) == 0 {
		delete(rooms, roomId)
	}
}

func sendJSON(c *client, v any) {
	b, _ := json.Marshal(v)
	c.w.Write([]byte("data: "))
	c.w.Write(b)
	c.w.Write([]byte("\n\n"))
	c.fl.Flush()
}

func broadcast(roomId string, msg any, excludeId, toId string) int {
	roomsMu.Lock()
	set := rooms[roomId]
	roomsMu.Unlock()
	if set == nil {
		return 0
	}
	delivered := 0
	for c := range set {
		if excludeId != "" && c.id == excludeId {
			continue
		}
		if toId != "" && c.id != toId {
			continue
		}
		sendJSON(c, msg)
		delivered++
	}
	return delivered
}
