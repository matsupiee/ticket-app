export function EventTagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="rounded-sm border px-2 py-1 text-xs text-muted-foreground">
          {tag}
        </span>
      ))}
    </div>
  );
}
