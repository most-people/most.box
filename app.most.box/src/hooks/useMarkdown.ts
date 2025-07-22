import { api } from "@/constants/api";

interface CodeBlockMdNode {
  info: string;
  literal: string;
  type: string;
  wysiwygNode: boolean;
}

const uploadImage = async (
  file: File,
  callback: (url: string, altText: string) => void
) => {
  const dotCID = localStorage.getItem("dotCID");
  const formData = new FormData();
  const params = new URLSearchParams(location.search);
  const name = params.get("name");
  formData.append("file", file);
  formData.append("path", `/.note/${name}/${file.name}`);

  const res = await api.put("/files.upload", formData);
  const cid = res.data.cid;
  if (cid) {
    callback(`${dotCID}/ipfs/${cid}`, file.name);
  } else {
    callback("", file.name);
  }
};

// https://www.latexlive.com
// https://nhn.github.io/tui.editor/latest/tutorial-example13-creating-plugin
const mathPlugin = () => {
  const toHTMLRenderers = {
    math(node: CodeBlockMdNode) {
      const literal =
        "\\documentclass{article}\n\\begin{document}\n$" +
        node.literal +
        "$\n\\end{document}";
      const latexjs = (window as any).latexjs;
      const generator = new latexjs.HtmlGenerator({
        hyphenate: false,
      });
      const { body } = latexjs.parse(literal, { generator }).htmlDocument();

      return [
        { type: "openTag", tagName: "div", outerNewLine: true },
        { type: "html", content: body.innerHTML },
        { type: "closeTag", tagName: "div", outerNewLine: true },
      ];
    },
  };

  return { toHTMLRenderers };
};

const mostPlugin = () => {
  const toHTMLRenderers = {
    mp(node: CodeBlockMdNode) {
      const html = `<mp-mi><a href="/mp/mi" target="_blank">加密模块</a><span>${node.literal}</span><input placeholder="输入密码" /><p>解密</p></mp-mi>`;
      return [
        { type: "openTag", tagName: "div", outerNewLine: true },
        { type: "html", content: html },
        { type: "closeTag", tagName: "div", outerNewLine: true },
      ];
    },
  };

  return { toHTMLRenderers };
};

const getEditorCore = (Editor: any) => {
  // https://nhn.github.io/tui.editor/latest/ToastUIEditorCore
  const { codeSyntaxHighlight } = Editor.plugin;
  return {
    theme: "light",
    language: "zh-CN",
    // 使用 google analytics
    usageStatistics: false,
    // 自动添加链接
    extendedAutolinks: true,
    linkAttributes: {
      target: "_blank",
    },
    plugins: [mostPlugin, codeSyntaxHighlight, mathPlugin],
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
  const editor = new Editor({
    el: editorElement,
    height: "100%",
    initialValue: "",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    // placeholder: "\n\n✍️ 开始记录你的灵感",
    // events: {
    //   change() {
    //     console.log(editor.getMarkdown());
    //   },
    // },
    // 隐藏切换到 markdown
    // hideModeSwitch: false,
    ...getEditorCore(Editor),
    hooks: {
      addImageBlobHook: uploadImage,
    },
    // https://github.com/nhn/tui.editor/blob/master/docs/en/toolbar.md
    toolbarItems: [
      ["heading", "bold", "italic", "strike"],
      ["hr", "quote"],
      ["ul", "ol", "task", "indent", "outdent"],
      ["table", "image", "link"],
      [
        "codeblock",
        {
          tooltip: "加密模块",
          command: "mp",
          text: "🔐",
          className: "toastui-editor-toolbar-icons",
          style: { backgroundImage: "none", fontSize: "18px" },
        },
        {
          tooltip: "LaTeX公式",
          command: "math",
          text: "🔢",
          className: "toastui-editor-toolbar-icons",
          style: { backgroundImage: "none", fontSize: "18px" },
        },
      ],
      ["scrollSync"],
    ],
  });

  const $mp = () => {
    const mi = editor.getSelectedText() || "mp://2.xxx.xxx";
    editor.replaceSelection("\n$$mp\n" + mi + "\n$$\n\n");
    if (editor.mode === "wysiwyg") editor.setMarkdown(editor.getMarkdown());
  };
  editor.addCommand("wysiwyg", "mp", $mp);
  editor.addCommand("markdown", "mp", $mp);

  const $math = () => {
    const latex = "a^{2}+b^{2}=c^{2}";
    editor.replaceSelection(
      "\n$$math\n" + latex + "\n$$\n" + "LaTeX公式编辑 www.latexlive.com\n\n"
    );
    if (editor.mode === "wysiwyg") editor.setMarkdown(editor.getMarkdown());
  };
  editor.addCommand("wysiwyg", "math", $math);
  editor.addCommand("markdown", "math", $math);
  return editor;
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

export const useMarkdown = () => {
  return {
    initEditor,
    initViewer,
  };
};
