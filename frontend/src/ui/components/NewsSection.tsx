import type { NewsItem } from "../../data/news";

type Props = {
  items: NewsItem[];
};

export function NewsSection({ items }: Props) {
  return (
    <section className="news-section">
      <h2>Market news</h2>
      {items.map((item) => (
        <article key={item.id} className="news-card">
          <p className="date">{item.date}</p>
          <h3 className="headline">{item.headline}</h3>
          <a className="link" href={item.href}>
            Learn more
          </a>
        </article>
      ))}
    </section>
  );
}


