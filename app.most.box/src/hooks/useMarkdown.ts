import { api } from "@/utils/api";
import { parse, HtmlGenerator } from "latex.js";
import { useUserStore } from "@/stores/userStore";

import { createCrustAuthHeader, uploadToIpfsGateway } from "@/utils/crust";
import { mostMnemonic } from "@/utils/MostWallet";
import { Wallet } from "ethers";

interface CodeBlockMdNode {
  info: string;
  literal: string;
  type: string;
  wysiwygNode: boolean;
}

let editorModulesPromise: Promise<[any, any, any]> | null = null;
const getEditorModules = () => {
  if (!editorModulesPromise) {
    editorModulesPromise = Promise.all([
      // @ts-ignore
      import("@toast-ui/editor"),
      import(
        // @ts-ignore
        "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js"
      ),
      // @ts-ignore
      import("@toast-ui/editor/dist/i18n/zh-cn"),
    ]);
  }
  return editorModulesPromise;
};

const uploadImage = async (
  file: File | Blob,
  callback: (url: string, altText: string) => void,
) => {
  const wallet = useUserStore.getState().wallet;
  if (!wallet) return;

  try {
    const mnemonic = mostMnemonic(wallet.danger);
    const account = Wallet.fromPhrase(mnemonic);
    const signature = await account.signMessage(account.address);
    const authHeader = createCrustAuthHeader(account.address, signature);

    const ipfs = await uploadToIpfsGateway(file as File, authHeader);
    const fileName = (file as File).name || `${file.size}`;

    // 注册到本地
    const params = new URLSearchParams(location.search);
    const noteName = params.get("name") || "default";

    useUserStore.getState().addNote({
      cid: ipfs.cid,
      name: fileName,
      size: file.size,
      type: "file",
      path: noteName,
    });

    if (ipfs.cid) {
      callback(`/ipfs/${ipfs.cid}?filename=${fileName}`, fileName);
    } else {
      callback("", fileName);
    }
  } catch (error) {
    console.error("上传图片失败", error);
    callback("", (file as File).name || "image");
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

const getEditorCore = (codeSyntaxHighlight: any) => {
  // https://nhn.github.io/tui.editor/latest/tutorial-example08-editor-with-code-syntax-highlight-plugin
  // const { codeSyntaxHighlight } = Editor.plugin;

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
        const dotCID = useUserStore.getState().dotCID;
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

const initEditor = async (el: HTMLDivElement) => {
  const [EditorModule, codeSyntaxHighlightModule] = await getEditorModules();
  const Editor = EditorModule.default;
  const codeSyntaxHighlight = codeSyntaxHighlightModule.default;
  const editor: any = new Editor({
    el,
    height: "100%",
    initialValue: "",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    placeholder: "\n✍️ 开始记录你的灵感",
    // 隐藏切换到 markdown
    // hideModeSwitch: false,
    ...getEditorCore(codeSyntaxHighlight),
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
  });

  const $math = () => {
    const latex = "a^{2}+b^{2}=c^{2}";
    editor.replaceSelection(
      "\n$$math\n" + latex + "\n$$\n\n" + "LaTeX公式编辑 latexlive.com\n",
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
    useUserStore.getState().setItem("homeTab", "file");
    window.open("/");
    return true;
  };
  editor.addCommand("wysiwyg", "file", $file);
  editor.addCommand("markdown", "file", $file);
  return editor;
};

const initViewer = async (el: HTMLDivElement) => {
  const [EditorModule, codeSyntaxHighlightModule] = await getEditorModules();
  const Editor = EditorModule.default;
  const codeSyntaxHighlight = codeSyntaxHighlightModule.default;
  return Editor.factory({
    el,
    viewer: true,
    ...getEditorCore(codeSyntaxHighlight),
  });
};

export const useMarkdown = () => {
  return {
    initEditor,
    initViewer,
  };
};
