const products = require("../_data/products.json");
const origin = "https://amfibido.com";

function structuredData(path, title, description, lang = "en") {
  const organization = {
    "@type": "Organization", "@id": `${origin}/#publisher`,
    name: "Roca Games", url: `${origin}/`, email: "ron@amfibido.com",
    logo: `${origin}/images/roca-logo.png`,
    sameAs: ["https://instagram.com/amfibido", "https://www.youtube.com/@amfibido"]
  };
  const graph = [organization, {
    "@type": "WebSite", "@id": `${origin}/#website`, name: "Amfibido",
    url: `${origin}/`, publisher: { "@id": organization["@id"] }
  }, {
    "@type": "WebPage", "@id": `${origin}${path}#webpage`,
    url: `${origin}${path}`, name: title, description, inLanguage: lang,
    isPartOf: { "@id": `${origin}/#website` },
    about: { "@id": `${origin}/#game` }
  }];
  if (path === "/") graph.push({
    "@type": "Game", "@id": `${origin}/#game`, name: "Amfibido: A Dojo Duel",
    url: `${origin}/`, description,
    image: `${origin}/images/shop/amfibido-game.png`, genre: "Tactical card game",
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 2 },
    typicalAgeRange: "10-",
    publisher: { "@id": organization["@id"] }
  });
  if (path === "/shop/") graph.push({
    "@type": "ItemList", "@id": `${origin}/shop/#catalog`,
    itemListElement: Object.entries(products).map(([key, product], index) => ({
      "@type": "ListItem", position: index + 1,
      item: {
        "@type": "Product", "@id": `${origin}/shop/#${key}`,
        name: product.name, description: product.description,
        url: `${origin}/shop/#${key}`, image: `${origin}${product.image}`,
        brand: { "@type": "Brand", name: "Amfibido" },
        offers: {
          "@type": "Offer", url: `${origin}/shop/#${key}`,
          price: product.price, priceCurrency: "EUR",
          seller: { "@id": organization["@id"] }
        }
      }
    }))
  });
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replace(/</g, "\\u003c");
}

module.exports = { structuredData };
