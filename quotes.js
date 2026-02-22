const QUOTES = [
  { q: "Education is the most powerful weapon you can use to change the world.", a: "— Nelson Mandela" },
  { q: "The beautiful thing about learning is that nobody can take it away from you.", a: "— B.B. King" },
  { q: "Success is not final, failure is not fatal. Courage continues the story.", a: "— Winston Churchill" },
  { q: "In Zambia, every child deserves a chance to learn.", a: "— SafeSpaceZM" }
];

let qi = 0;

function rotateQuote(){
  document.getElementById("qText").textContent = `"${QUOTES[qi].q}"`;
  document.getElementById("qAuth").textContent = QUOTES[qi].a;
  qi = (qi + 1) % QUOTES.length;
}

rotateQuote();
setInterval(rotateQuote, 5000);
