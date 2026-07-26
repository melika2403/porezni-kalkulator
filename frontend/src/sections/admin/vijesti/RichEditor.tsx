"use client";

/* Editor teksta za vijesti i vodiče (TipTap). Proizvodi HTML koji backend
   sanitizira prije upisa, pa se ovdje ne oslanjamo na to da je izlaz bezbjedan.

   StarterKit v3 već nosi Link i Underline, pa se dodatno uključuje samo slika.
   Link se ne otvara na klik unutar editora (openOnClick: false), inače bi se
   pri uređivanju izlazilo sa stranice. */

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { adminUploadSliku } from "src/api/vijesti";
import styles from "./adminVijesti.module.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

function Dugme({
  aktivno,
  naslov,
  onClick,
  children,
}: {
  aktivno?: boolean;
  naslov: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={naslov}
      aria-label={naslov}
      className={`${styles.tbBtn} ${aktivno ? styles.tbBtnActive : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LinkPolje({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string>(
    (editor.getAttributes("link").href as string) || "",
  );
  const primijeni = () => {
    const v = url.trim();
    if (!v) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: v })
        .run();
    }
    onClose();
  };
  return (
    <div className={styles.linkRow}>
      <input
        className={styles.linkInput}
        autoFocus
        placeholder="/preracun-neto-bruto ili https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            primijeni();
          }
          if (e.key === "Escape") onClose();
        }}
      />
      <button type="button" className={styles.linkBtn} onClick={primijeni}>
        Postavi
      </button>
      <button type="button" className={styles.linkCancel} onClick={onClose}>
        Odustani
      </button>
    </div>
  );
}

export default function RichEditor({ value, onChange }: Props) {
  const [linkOtvoren, setLinkOtvoren] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const [saljem, setSaljem] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    // Next renderuje na serveru, TipTap traži da se prvi render preskoči
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: false },
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({ inline: false }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: { attributes: { class: styles.proseArea } },
  });

  const ubaciSliku = useCallback(
    async (file: File) => {
      setGreska(null);
      setSaljem(true);
      const res = await adminUploadSliku(file);
      setSaljem(false);
      if (!res.ok) {
        setGreska(
          res.error === "INVALID_IMAGE_TYPE"
            ? "Dozvoljeni formati su PNG, JPG i WEBP."
            : res.error === "LIMIT_FILE_SIZE"
              ? "Slika je prevelika, najviše 6 MB."
              : "Slanje slike nije uspjelo.",
        );
        return;
      }
      if (!res.data) {
        setGreska("Slanje slike nije uspjelo.");
        return;
      }
      editor?.chain().focus().setImage({ src: res.data.url, alt: "" }).run();
    },
    [editor],
  );

  if (!editor) return <div className={styles.editorLoading}>Učitavanje editora...</div>;

  return (
    <div className={styles.editorWrap}>
      <div className={styles.toolbar}>
        <Dugme
          naslov="Podebljano"
          aktivno={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </Dugme>
        <Dugme
          naslov="Kurziv"
          aktivno={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </Dugme>
        <span className={styles.tbSep} />
        <Dugme
          naslov="Podnaslov (H2)"
          aktivno={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Dugme>
        <Dugme
          naslov="Podnaslov (H3)"
          aktivno={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Dugme>
        <span className={styles.tbSep} />
        <Dugme
          naslov="Lista"
          aktivno={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </Dugme>
        <Dugme
          naslov="Numerisana lista"
          aktivno={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </Dugme>
        <Dugme
          naslov="Citat"
          aktivno={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &raquo;
        </Dugme>
        <span className={styles.tbSep} />
        <Dugme
          naslov="Veza"
          aktivno={editor.isActive("link")}
          onClick={() => setLinkOtvoren((v) => !v)}
        >
          🔗
        </Dugme>
        <Dugme naslov="Slika u tekstu" onClick={() => fileRef.current?.click()}>
          🖼
        </Dugme>
        <span className={styles.tbSep} />
        <Dugme
          naslov="Poništi"
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </Dugme>
        <Dugme
          naslov="Vrati"
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </Dugme>
        {saljem && <span className={styles.tbNote}>Šaljem sliku...</span>}
      </div>

      {linkOtvoren && (
        <LinkPolje editor={editor} onClose={() => setLinkOtvoren(false)} />
      )}
      {greska && <p className={styles.editorError}>{greska}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ubaciSliku(f);
          e.target.value = "";
        }}
      />

      <EditorContent editor={editor} />
    </div>
  );
}
