import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

let API_KEY = 'AIzaSyALI4uNqZqcjOkF8XGpSbevLx0awAEMu-Y';

let form = document.querySelector('form');
let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');


const imagePicker = document.getElementById("imagePicker");
const imageUpload = document.getElementById("imageUpload");

imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const src = event.target.result;

   
    const newLabel = document.createElement("label");
    newLabel.classList.add("image-choice", "new-image");
    newLabel.innerHTML = `
      <input type="radio" name="chosen-image" value="${src}" checked>
      <img src="${src}" alt="Uploaded image">
    `;

    imagePicker.insertBefore(newLabel, imagePicker.firstChild);
  };

  reader.readAsDataURL(file);
});


form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
    // Load the image as a base64 string
    let imageUrl = form.elements.namedItem('chosen-image').value;
    let imageBase64 = await fetch(imageUrl)
      .then(r => r.arrayBuffer())
      .then(a => Base64.fromByteArray(new Uint8Array(a)));

    // Assemble the prompt by combining the text with the chosen image
    let contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: promptInput.value }
        ]
      }
    ];

    // Call the multimodal model, and get a stream of results
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // Read from the stream and interpret the output as markdown
    let buffer = [];
    let md = new MarkdownIt();
    for await (let response of stream) {
      buffer.push(response.text);
      output.innerHTML = md.render(buffer.join(''));
    }
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

// You can delete this once you've filled out an API key
maybeShowApiKeyBanner(API_KEY);