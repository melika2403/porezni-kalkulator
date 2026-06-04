<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pravopis: nikad em dash

Nikad ne koristi em dash (—) u kodu ni u tekstu vidljivom korisniku. Umjesto njega koristi zarez, dvotačku, tačku, običnu crticu (-) ili zagrade. Za prazne vrijednosti ("nema podatka") koristi en dash (–), ne em dash.

Postoji oko 1300 postojećih em dasheva u `src/` koji se čiste postepeno. Planirana je `check:emdash` skripta koja će puknuti ako se nađe em dash, pa novi kod ne smije uvoditi nove.
