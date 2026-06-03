// Reusable JSON-LD renderer — jedan izvor istine za injektovanje structured
// data. Prima jedan schema objekat ili niz, renderuje svaki kao zaseban
// <script type="application/ld+json">. Server component (nema "use client").
//
// Upotreba:
//   <JsonLd schema={faqSchema} />
//   <JsonLd schema={[faqSchema, howToSchema, breadcrumbSchema]} />

export default function JsonLd({
  schema,
}: {
  schema: object | object[];
}) {
  const list = Array.isArray(schema) ? schema : [schema];
  return (
    <>
      {list.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  );
}
