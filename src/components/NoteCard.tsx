import { Link } from "react-router-dom";

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function NoteCard({
  note,
  compact = false,
  href
}: {
  note: NoteItem;
  compact?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-sm font-medium text-white/90">{note.title}</div>
      <div
        className={`text-sm text-white/60 whitespace-pre-line ${
          compact ? "max-h-24 overflow-hidden" : ""
        }`}
      >
        {note.content}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block glass-card p-4 space-y-2 transition-transform duration-200 hover:-translate-y-0.5"
      >
        {body}
      </Link>
    );
  }

  return <div className="glass-card p-4 space-y-2">{body}</div>;
}
