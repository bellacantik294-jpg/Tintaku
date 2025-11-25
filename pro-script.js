
document.addEventListener("DOMContentLoaded",() => {
  const container = document.getElementById("cerpenList");
  cerpenData.forEach(c => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>${c.title}</h3><p>${c.excerpt}</p><a href="${c.link}">Baca selengkapnya</a>`;
    container.appendChild(card);
  });
});
