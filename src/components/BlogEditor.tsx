"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { useSyncExternalStore } from "react";

// Hook to detect client-side rendering without causing cascading renders
const useIsClient = () => {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
};

interface BlogEditorProps {
  value: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

// Custom upload adapter for CKEditor
class CustomUploadAdapter {
  private loader: any;
  private onImageUpload?: (file: File) => Promise<string>;

  constructor(loader: any, onImageUpload?: (file: File) => Promise<string>) {
    this.loader = loader;
    this.onImageUpload = onImageUpload;
  }

  upload() {
    return this.loader.file.then((file: File) => {
      if (this.onImageUpload) {
        return this.onImageUpload(file).then((url: string) => ({
          default: url,
        }));
      }
      return Promise.reject("No upload handler provided");
    });
  }

  abort() {
    // Abort upload if needed
  }
}

function CustomUploadAdapterPlugin(
  editor: any,
  onImageUpload?: (file: File) => Promise<string>,
) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader: any) => {
    return new CustomUploadAdapter(loader, onImageUpload);
  };
}

export default function BlogEditor({
  value,
  onChange,
  onImageUpload,
}: BlogEditorProps) {
  const editorLoaded = useIsClient();

  if (!editorLoaded) {
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
      <CKEditor
        editor={ClassicEditor as any}
        data={value}
        config={{
          licenseKey: "GPL",
          toolbar: [
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "strikethrough",
            "|",
            "link",
            "bulletedList",
            "numberedList",
            "|",
            "outdent",
            "indent",
            "|",
            "imageUpload",
            "blockQuote",
            "insertTable",
            "mediaEmbed",
            "|",
            "undo",
            "redo",
          ],
          heading: {
            options: [
              {
                model: "paragraph",
                title: "Paragraph",
                class: "ck-heading_paragraph",
              },
              {
                model: "heading2",
                view: "h2",
                title: "Heading 2",
                class: "ck-heading_heading2",
              },
              {
                model: "heading3",
                view: "h3",
                title: "Heading 3",
                class: "ck-heading_heading3",
              },
              {
                model: "heading4",
                view: "h4",
                title: "Heading 4",
                class: "ck-heading_heading4",
              },
            ],
          },
          image: {
            toolbar: [
              "imageTextAlternative",
              "imageStyle:inline",
              "imageStyle:block",
              "imageStyle:side",
            ],
          },
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
          placeholder: "Мэдээний агуулгыг энд бичнэ үү...",
        }}
        onReady={(editor: any) => {
          if (onImageUpload) {
            CustomUploadAdapterPlugin(editor, onImageUpload);
          }
        }}
        onChange={(_event: any, editor: any) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
      <style jsx global>{`
        .blog-editor .ck-editor__editable {
          min-height: 400px;
          max-height: 600px;
          color: #1f2937 !important;
        }
        .blog-editor .ck-editor__editable:focus {
          border-color: #c45c26 !important;
          box-shadow: 0 0 0 2px rgba(196, 92, 38, 0.2) !important;
        }
        .blog-editor .ck.ck-editor__main > .ck-editor__editable {
          background: white;
          color: #1f2937;
        }
        .blog-editor .ck-content {
          color: #1f2937 !important;
        }
        .blog-editor .ck-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .blog-editor .ck-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .blog-editor .ck-content h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .blog-editor .ck-content p {
          margin-bottom: 1rem;
          line-height: 1.75;
        }
        .blog-editor .ck-content ul,
        .blog-editor .ck-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .blog-editor .ck-content blockquote {
          border-left: 4px solid #c45c26;
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          color: #666;
        }
        .blog-editor .ck-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .blog-editor .ck-content a {
          color: #c45c26;
          text-decoration: underline;
        }
        .blog-editor .ck-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1rem;
        }
        .blog-editor .ck-content table td,
        .blog-editor .ck-content table th {
          border: 1px solid #ddd;
          padding: 0.5rem;
        }
        .blog-editor .ck-content table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
