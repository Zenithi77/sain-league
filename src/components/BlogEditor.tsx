"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { useRef, useCallback } from "react";

interface BlogEditorProps {
  value: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`blog-toolbar-btn${active ? " active" : ""}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="blog-toolbar-divider" />;
}

export default function BlogEditor({
  value,
  onChange,
  onImageUpload,
}: BlogEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "Мэдээний агуулгыг энд бичнэ үү...",
      }),
      Youtube.configure({ controls: true }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImageUpload || !editor) return;
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch {
        alert("Зураг байршуулахад алдаа гарлаа");
      }
      e.target.value = "";
    },
    [editor, onImageUpload],
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL оруулна уу:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("YouTube URL оруулна уу:");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        style={{
          minHeight: 400,
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-dark)",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          Эдитор ачаалж байна...
        </span>
      </div>
    );
  }

  return (
    <div className="blog-editor">
      {/* ── Toolbar ── */}
      <div className="blog-toolbar">
        {/* Heading dropdown */}
        <select
          className="blog-toolbar-select"
          value={
            editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : editor.isActive("heading", { level: 4 })
                  ? "h4"
                  : "p"
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === "p") {
              editor.chain().focus().setParagraph().run();
            } else {
              const level = Number(val.replace("h", "")) as 2 | 3 | 4;
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <i className="fas fa-bold" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <i className="fas fa-italic" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <i className="fas fa-underline" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <i className="fas fa-strikethrough" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={addLink}
          active={editor.isActive("link")}
          title="Link"
        >
          <i className="fas fa-link" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <i className="fas fa-list-ul" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <i className="fas fa-list-ol" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={!onImageUpload}
          title="Image Upload"
        >
          <i className="fas fa-image" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Block Quote"
        >
          <i className="fas fa-quote-right" />
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} title="Insert Table">
          <i className="fas fa-table" />
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="YouTube Video">
          <i className="fab fa-youtube" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <i className="fas fa-undo" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <i className="fas fa-redo" />
        </ToolbarButton>
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />

      {/* ── Editor Content ── */}
      <EditorContent editor={editor} />

      <style jsx global>{`
        /* ── Toolbar ── */
        .blog-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          align-items: center;
          padding: 8px;
          border: 1px solid #ddd;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          background: #f9fafb;
        }
        .blog-toolbar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: #374151;
          cursor: pointer;
          font-size: 14px;
          transition:
            background 0.15s,
            color 0.15s;
        }
        .blog-toolbar-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }
        .blog-toolbar-btn.active {
          background: #c45c26;
          color: white;
        }
        .blog-toolbar-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .blog-toolbar-select {
          height: 32px;
          padding: 0 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          color: #374151;
          font-size: 13px;
          cursor: pointer;
        }
        .blog-toolbar-divider {
          width: 1px;
          height: 24px;
          background: #d1d5db;
          margin: 0 4px;
        }

        /* ── Editor area ── */
        .blog-editor .tiptap {
          min-height: 400px;
          max-height: 600px;
          overflow-y: auto;
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 0 0 8px 8px;
          background: white;
          color: #1f2937;
          outline: none;
        }
        .blog-editor .tiptap:focus {
          border-color: #c45c26;
          box-shadow: 0 0 0 2px rgba(196, 92, 38, 0.2);
        }
        .blog-editor .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .blog-editor .tiptap h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .blog-editor .tiptap h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .blog-editor .tiptap h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .blog-editor .tiptap p {
          margin-bottom: 1rem;
          line-height: 1.75;
        }
        .blog-editor .tiptap ul,
        .blog-editor .tiptap ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .blog-editor .tiptap ul {
          list-style: disc;
        }
        .blog-editor .tiptap ol {
          list-style: decimal;
        }
        .blog-editor .tiptap blockquote {
          border-left: 4px solid #c45c26;
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          color: #666;
        }
        .blog-editor .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .blog-editor .tiptap a {
          color: #c45c26;
          text-decoration: underline;
        }
        .blog-editor .tiptap table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1rem;
        }
        .blog-editor .tiptap table td,
        .blog-editor .tiptap table th {
          border: 1px solid #ddd;
          padding: 0.5rem;
        }
        .blog-editor .tiptap table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        .blog-editor .tiptap iframe {
          max-width: 100%;
          border-radius: 12px;
          margin: 24px 0;
        }
      `}</style>
    </div>
  );
}
