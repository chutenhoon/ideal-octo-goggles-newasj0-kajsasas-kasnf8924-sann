export type WebMemory = {
  slug: string;
  title: string;
  subtitle?: string;
};

export const webMemories: WebMemory[] = [
  {
    slug: "Loinhanchoem",
    title: "Lời nhắn cho em",
    subtitle: "(Mật Khẩu: LANANH)"
  },
  {
    slug: "20th11",
    title: "20/11"
  },
  {
    slug: "Caythong",
    title: "Cây thông"
  },
  {
    slug: "Emdungkhoc",
    title: "Em đừng khóc"
  }
];

export function webMemoryUrl(slug: string) {
  return `/webmemory/${slug}/index.html`;
}
