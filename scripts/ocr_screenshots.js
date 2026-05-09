const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");

const images = [
  "C:\\Users\\keert\\.gemini\\antigravity\\brain\\bf239139-7343-4e5b-8692-b5a497969e26\\media__1776788226134.png",
  "C:\\Users\\keert\\.gemini\\antigravity\\brain\\bf239139-7343-4e5b-8692-b5a497969e26\\media__1776788276214.png",
  "C:\\Users\\keert\\.gemini\\antigravity\\brain\\bf239139-7343-4e5b-8692-b5a497969e26\\media__1776788287438.png"
];

async function scan() {
  console.log("Starting OCR scan of the user's 3 original pictures...");
  for (let i = 0; i < images.length; i++) {
    console.log(`Scanning image ${i + 1}...`);
    try {
      const { data: { text } } = await Tesseract.recognize(images[i], "eng");
      console.log(`\n--- TEXT FROM IMAGE ${i + 1} ---\n`);
      console.log(text);
      console.log(`\n---------------------------\n`);
    } catch(e) {
      console.error(e);
    }
  }
}

scan();
