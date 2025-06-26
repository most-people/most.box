// import { api } from "@/constants/api";

interface CustomNode {
  info: string;
  literal: string;
  type: string;
  wysiwygNode: boolean;
}

const uploadImage = async (
  file: File
  // callback: (url: string, altText: string) => void
) => {
  const formData = new FormData();
  formData.append("file", file);
  console.log("🌊", formData);
  // const res = await api({
  //   method: 'PUT',
  //   url: '/file/upload',
  //   data: formData,
  //   headers: {
  //     'Content-Type': 'multipart/form-data',
  //     Size: file.size,
  //     Name: `${uploadPrefix}/${Date.now()}_${file.name}`,
  //   },
  // })
  // if (res.data.filename) {
  //   callback(`${VITE_MP_File}/${res.data.filename}`, file.name)
  // } else {
  //   callback('', file.name)
  // }
};

const customPlugin = () => {
  const toHTMLRenderers = {
    mp_mi(node: CustomNode) {
      const html = `<mp-mi><a href="/mp/mi" target="_blank">加密明文</a><span>${node.literal}</span><input placeholder="输入密码" /><p>解密</p></mp-mi>`;
      return [
        { type: "openTag", tagName: "div", outerNewLine: true },
        { type: "html", content: html },
        { type: "closeTag", tagName: "div", outerNewLine: true },
      ];
    },
    style(node: CustomNode) {
      return [
        { type: "openTag", tagName: "style", outerNewLine: true },
        { type: "html", content: node.literal },
        { type: "closeTag", tagName: "style", outerNewLine: true },
      ];
    },
  };

  return { toHTMLRenderers };
};

const getEditorCore = (Editor: any) => {
  // https://nhn.github.io/tui.editor/latest/ToastUIEditorCore
  const { codeSyntaxHighlight } = Editor.plugin;
  return {
    language: "zh-CN",
    // 使用 google analytics
    usageStatistics: false,
    // 自动添加链接
    extendedAutolinks: true,
    linkAttributes: {
      target: "_blank",
    },
    plugins: [customPlugin, codeSyntaxHighlight],
    customHTMLSanitizer(html: string) {
      return html;
    },
  };
};

const initEditor = () => {
  const Editor = (window as any).toastui?.Editor;
  const editorElement = document.querySelector("#editorElement");
  if (!editorElement) {
    return;
  }
  return new Editor({
    el: editorElement,
    height: "100%",
    initialValue: "",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    // 隐藏切换到 markdown
    // hideModeSwitch: false,
    ...getEditorCore(Editor),
    hooks: {
      addImageBlobHook: uploadImage,
    },
  });
};

const initViewer = () => {
  const Editor = (window as any).toastui?.Editor;
  const viewerElement = document.querySelector("#viewerElement");
  if (!viewerElement) {
    return;
  }
  return Editor.factory({
    el: viewerElement,
    viewer: true,
    ...getEditorCore(Editor),
  });
};

export const useToastUI = () => {
  return {
    initEditor,
    initViewer,
  };
};
