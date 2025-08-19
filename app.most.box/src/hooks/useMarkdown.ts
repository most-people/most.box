import { api } from "@/constants/api";
import type { Editor } from "@toast-ui/editor";
import { parse, HtmlGenerator } from "latex.js";

interface CodeBlockMdNode {
  info: string;
  literal: string;
  type: string;
  wysiwygNode: boolean;
}

const uploadImage = async (
  file: File | Blob,
  callback: (url: string, altText: string) => void
) => {
  const formData = new FormData();
  const params = new URLSearchParams(location.search);
  const name = params.get("name");
  const fileName = `${file.size}-${(file as File).name}`;
  formData.append("file", file);
  formData.append("path", `/.note/${name}/${fileName}`);

  const res = await api.put("/files.upload", formData);
  const cid = res.data.cid;
  if (cid) {
    callback(`/ipfs/${cid}?filename=${fileName}`, fileName);
  } else {
    callback("", fileName);
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

      const generator = new HtmlGenerator({
        hyphenate: false,
      });

      const { body } = parse(literal, { generator }).htmlDocument();

      return [
        { type: "openTag", tagName: "div", outerNewLine: true },
        { type: "html", content: body.innerHTML },
        { type: "closeTag", tagName: "div", outerNewLine: true },
      ];
    },
  };

  return { toHTMLRenderers };
};

const getEditorCore = () => {
  // https://nhn.github.io/tui.editor/latest/ToastUIEditorCore
  const Editor = (window as any).toastui?.Editor;
  // https://nhn.github.io/tui.editor/latest/tutorial-example08-editor-with-code-syntax-highlight-plugin
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
    plugins: [codeSyntaxHighlight, mathPlugin],
    customHTMLRenderer: {
      // https://github.com/nhn/tui.editor/blob/master/docs/en/custom-html-renderer.md#skipchildren
      image(node: any, context: any) {
        context.skipChildren();
        const src = node.destination;
        const alt = node.firstChild?.literal || "";
        const dotCID = localStorage.getItem("dotCID");
        return {
          type: "openTag",
          tagName: "img",
          attributes: {
            src: src.startsWith("/ipfs/") ? dotCID + src : src,
            alt,
            loading: "lazy",
          },
          selfClose: true,
        };
      },
    },
    customHTMLSanitizer(html: string) {
      return html;
    },
  };
};

const initEditor = (el: HTMLDivElement) => {
  const Editor = (window as any).toastui?.Editor;
  const options = {
    el,
    height: "100%",
    initialValue: "",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    placeholder: "\n✍️ 开始记录你的灵感",
    // 隐藏切换到 markdown
    // hideModeSwitch: false,
    ...getEditorCore(),
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
          name: "math",
          tooltip: "插入LaTeX公式",
          command: "math",
          text: "∑",
          className: "toastui-editor-toolbar-icons",
          style: { backgroundImage: "none", fontSize: "18px" },
        },
        {
          name: "file",
          tooltip: "插入文件",
          command: "file",
          text: "📂",
          className: "toastui-editor-toolbar-icons",
          style: { backgroundImage: "none", fontSize: "18px" },
        },
      ],
      ["scrollSync"],
    ],
  };
  const editor: Editor = new Editor(options);

  const $math = () => {
    const latex = "a^{2}+b^{2}=c^{2}";
    editor.replaceSelection(
      "\n$$math\n" + latex + "\n$$\n\n" + "LaTeX公式编辑 latexlive.com\n"
    );
    // if (editor.isWysiwygMode()) {
    //   editor.setMarkdown(editor.getMarkdown());
    //   editor.changeMode("markdown");
    // }
    return true;
  };
  editor.addCommand("wysiwyg", "math", $math);
  editor.addCommand("markdown", "math", $math);

  const $file = () => {
    localStorage.setItem("homeTab", "file");
    window.open("/");
    return true;
  };
  editor.addCommand("wysiwyg", "file", $file);
  editor.addCommand("markdown", "file", $file);
  return editor;
};

const initViewer = (el: HTMLDivElement) => {
  const Editor = (window as any).toastui?.Editor;
  return Editor.factory({
    el,
    viewer: true,
    ...getEditorCore(),
  });
};

export const useMarkdown = () => {
  return {
    initEditor,
    initViewer,
  };
};
