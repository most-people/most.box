"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Crepe } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/utils";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface MilkdownEditorProps {
  content: string;
  readOnly?: boolean;
  onChange?: (markdown: string) => void;
  className?: string;
}

export interface MilkdownEditorRef {
  setMarkdown: (markdown: string) => void;
  getMarkdown: () => string;
}

export const MilkdownEditor = forwardRef<
  MilkdownEditorRef,
  MilkdownEditorProps
>(({ content, readOnly, onChange, className }, ref) => {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const [isReady, setIsReady] = useState(false);
  const onChangeRef = useRef(onChange);

  // Update onChangeRef when prop changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    setMarkdown: (markdown: string) => {
      if (crepeRef.current && isReady) {
        crepeRef.current.editor.action(replaceAll(markdown));
      }
    },
    getMarkdown: () => {
      return crepeRef.current ? crepeRef.current.getMarkdown() : "";
    },
  }));

  useEffect(() => {
    if (!divRef.current) return;

    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: content,
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: "输入 / 以使用命令...",
        },
        [Crepe.Feature.ImageBlock]: {
          inlineUploadButton: "上传图片",
          inlineUploadPlaceholderText: "或粘贴图片链接...",
          blockUploadButton: "上传图片",
          blockUploadPlaceholderText: "或粘贴图片链接...",
          blockCaptionPlaceholderText: "添加标题...",
        },
        [Crepe.Feature.BlockEdit]: {
          textGroup: {
            label: "基础",
            text: {
              label: "文本",
            },
            h1: {
              label: "一级标题",
            },
            h2: {
              label: "二级标题",
            },
            h3: {
              label: "三级标题",
            },
            h4: {
              label: "四级标题",
            },
            h5: {
              label: "五级标题",
            },
            h6: {
              label: "六级标题",
            },
            quote: {
              label: "引用",
            },
            divider: {
              label: "分割线",
            },
          },
          listGroup: {
            label: "列表",
            bulletList: {
              label: "无序列表",
            },
            orderedList: {
              label: "有序列表",
            },
            taskList: {
              label: "任务列表",
            },
          },
          advancedGroup: {
            label: "高级",
            image: {
              label: "图片",
            },
            codeBlock: {
              label: "代码块",
            },
            table: {
              label: "表格",
            },
            math: {
              label: "数学公式",
            },
          },
        },
      },
    });

    // Configure listener
    crepe.on((listener) => {
      listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
        if (onChangeRef.current && markdown !== prevMarkdown) {
          onChangeRef.current(markdown);
        }
      });
    });

    crepe.create().then(() => {
      crepeRef.current = crepe;
      // Set initial readonly state
      if (readOnly !== undefined) {
        crepe.setReadonly(readOnly);
      }
      setIsReady(true);
    });

    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy();
        crepeRef.current = null;
      }
    };
  }, []); // Run once

  useEffect(() => {
    if (crepeRef.current && isReady) {
      crepeRef.current.setReadonly(!!readOnly);
    }
  }, [readOnly, isReady]);

  useEffect(() => {
    if (crepeRef.current && isReady) {
      const currentMarkdown = crepeRef.current.getMarkdown();
      if (content !== currentMarkdown) {
        crepeRef.current.editor.action(replaceAll(content));
      }
    }
  }, [content, isReady]);

  return <div ref={divRef} className={className} style={{ height: "100%" }} />;
});

MilkdownEditor.displayName = "MilkdownEditor";
