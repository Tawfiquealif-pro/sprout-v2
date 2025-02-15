let selectedImage = null
let currentPlant = null
const getloading = document.getElementById('loading')
const loadingBar = document.getElementById('overlay')
const chatBox = document.getElementById('chat_box')
const aiButton = document.getElementById('ai_button')
const backButton = document.getElementById('back_button')
const thumbnailPlaceholder = document.getElementById('thumbnail')
const resultTab = document.getElementById('result_tab')
const plantNamePlaceholder = document.getElementById('plant_name')
const plantCommonNamePlaceholder = document.getElementById('common_name')
const apiKey = 'jVybrcyLFhClm0hwffEWTV09bztS2ClDs71hDVkpIAEXjpoGF6';
const apiUrl = 'https://api.plant.id/v2/identify';
const loadingStatus = document.getElementById('loading_status')
const classificationPlaceholder = document.getElementById('classification')
const commonPlacePlaceholder = document.getElementById('common_place')
const lifeSpanPlaceholder =document.getElementById('life_span')
const intrestingFact = document.getElementById('facts')
const leaveButton = document.getElementById('leave')
const stayButton = document.getElementById('stay')
const closeChat = document.getElementById('close_chat')
const warningLayer = document.getElementById('warning_layer')
const reset = document.getElementById('reset')

document.addEventListener("DOMContentLoaded", () => { 
const dropbox = document.getElementById("dropbox");
const fileInput = document.getElementById("fileInput");

// Define the click event handler as a separate function
const handleClick = () => {
fileInput.click();
};

// Attach the click event listener
dropbox.addEventListener("click", handleClick);

dropbox.addEventListener("dragover", (e) => {
e.preventDefault();
dropbox.style.background = "#2b5b2b";
});

dropbox.addEventListener("dragleave", () => {
dropbox.style.background = "#1d3b1d";
});

dropbox.addEventListener("drop", (e) => {
e.preventDefault();
dropbox.style.background = "#1d3b1d";
const files = e.dataTransfer.files;
if (files.length > 0) {
    handleFile(files[0]);
}
});

fileInput.addEventListener("change", (e) => {
if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
}
});

function handleFile(file) {
// Remove the click event listener after file is handled
dropbox.removeEventListener("click", handleClick);

if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (event) {
        dropbox.innerHTML = `
            <img src="${event.target.result}" alt="Uploaded Image">
            <button id="identifyBtn">Identify</button>
            <button id="choose_another">Choose another</button>
        `;
        dropbox.style.border = "none";
        const chooseAnother = document.getElementById('choose_another')
        chooseAnother.addEventListener('click', goBack)

         // Remove border for cleaner look
         selectedImage = file;

        // Add event listener to the Identify button
        document.getElementById("identifyBtn").addEventListener("click", () => {
            sendAPIrequest(event.target.result)
        });
    };
    reader.readAsDataURL(file);

} else {
    alert("Please upload an image file.");
}
}

closeChat.addEventListener('click', function(){
  warningLayer.style.display = 'flex'
})

stayButton.addEventListener('click', function(){
  warningLayer.style.display = 'none'
})

leaveButton.addEventListener('click', goBack)

async function sendAPIrequest(thumbnail) {
    if (!selectedImage) {
        alert('Please upload an image first!');
        return;
    }
    loadingBar.style.display = 'flex';
    console.log('Pressed');

    const formData = new FormData();
    formData.append('images', selectedImage);
    formData.append('organs', 'leaf'); // Consider removing this for better generalization

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Api-Key': apiKey },
            body: formData
        });

        const data = await response.json();

        if (!data.suggestions || data.suggestions.length === 0) {
            loadingStatus.innerHTML = '❌ No plant identified. Please try another image.';
            reset.style.display = 'block'
            reset.addEventListener('click', goBack)
            return;
        }
        let gptProvidedInfo
        // Filter results based on confidence score
        const highConfidenceResults = data.suggestions.filter(
            (suggestion) => suggestion.probability * 100 >= 50
            
        );
            const position = await getLocation();
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            if (highConfidenceResults.length === 0) {
                loadingStatus.innerHTML = '❌ No confident match found. Try another image.';
                reset.style.display = 'block'
                reset.addEventListener('click', goBack)
                return;
            }
    
            const responseInfo = highConfidenceResults[0]; // Use highest confidence match
            const scientificName = responseInfo.plant_details?.scientific_name || 'Unknown Plant';
            const locationName = await reverseGeocode(lat, lon);
            // Now send the readable location to GPT
             gptProvidedInfo = await getPlantInfoFromGPT(scientificName, locationName);
    


        let PLANT = { 
            commonName: gptProvidedInfo.common_name, 
            scientificName: scientificName, 
            classification: null 
        };

        resultTab.style.display = 'flex';
        getloading.style.display = 'none';
        plantNamePlaceholder.textContent = scientificName;
        plantCommonNamePlaceholder.textContent = gptProvidedInfo.common_name; // Fix common name display
        lifeSpanPlaceholder.textContent = gptProvidedInfo.average_life_span
        classificationPlaceholder.innerHTML = `<ul><li>Family- ${gptProvidedInfo.classification.family}</li>
                                              <li>Genus- ${gptProvidedInfo.classification.genus}</li></ul>`
        intrestingFact.textContent = gptProvidedInfo.interesting_fact

        thumbnailPlaceholder.src = thumbnail;

        aiButton.addEventListener('click', function () {
            setCurrentPlant(PLANT);
            const imgicon = document.getElementById('imgIcon');
            const topicName = document.getElementById('topic_name');
            chatBox.style.display = 'block';
            document.getElementById('submit_message').addEventListener('click', sendMessage);
            resultTab.style.display = 'none';
            imgicon.src = thumbnail;
            topicName.textContent = scientificName;
        });

        backButton.addEventListener('click', goBack);
    } catch (error) {
        console.error(error);
        loadingStatus.innerHTML = '❌ Failed to identify the plant. Please try again.';
    }
}


function goBack(){
  selectedImage = null;
  chatBox.style.display = 'none'
  chatBox.innerHTML = ''
  resultTab.style.display = 'none'
  loadingBar.style.display = 'none'
    loadingStatus.textContent = 'Fetching..'
  reset.style.display = 'none'
  getloading.style.display = 'block'
  dropbox.innerHTML = ''
  dropbox.innerHTML = `
                          <h2>Sprout helps your plant grow</h2>
                <div class="drag-area">
                    <p>Place your plant image here</p>
                    <input type="file" id="fileInput" accept="image/*" hidden>
                </div>
                <div class="click-area">
                    <p>Click a image</p>
                </div>`
}
// Modified sendMessage function to use formatting
async function sendMessage() {
const userInput = document.getElementById("user-message").value.trim();
if (!userInput) return;

addChatMessage("user", userInput);
document.getElementById("user-message").value = "";

const botRawResponse = await getChatbotResponse(userInput);
const formattedResponse = formatBotResponse(botRawResponse);  // Format the bot's raw response
addChatMessage("bot", formattedResponse);
}

// Function to display messages with styling
function addChatMessage(sender, message) {
const chatBox = document.getElementById("chat_body");
const messageDiv = document.createElement("div");
messageDiv.className = `message ${sender}-message`;

if (sender === 'bot') {
// Create a temporary div to parse the HTML content
const tempDiv = document.createElement('div');
tempDiv.innerHTML = message.trim();
const nodes = Array.from(tempDiv.childNodes);

chatBox.appendChild(messageDiv);
chatBox.scrollTop = chatBox.scrollHeight;

let nodeIndex = 0;

// Function to type out each HTML element
function typeNextNode() {
    if (nodeIndex < nodes.length) {
        const currentNode = nodes[nodeIndex];

        if (currentNode.nodeType === Node.TEXT_NODE) {
            // For text nodes, simulate typing character by character
            let textContent = currentNode.textContent;
            let charIndex = 0;

            const typingInterval = setInterval(() => {
                if (charIndex < textContent.length) {
                    messageDiv.innerHTML += textContent.charAt(charIndex);
                    charIndex++;
                    chatBox.scrollTop = chatBox.scrollHeight;
                } else {
                    clearInterval(typingInterval);
                    nodeIndex++;
                    typeNextNode(); // Move to the next node after text
                }
            }, 55); // Typing speed
        } else {
            // For HTML elements, append them immediately
            messageDiv.appendChild(currentNode.cloneNode(true));
            nodeIndex++;
            typeNextNode(); // Move to the next node
        }
    }
}

typeNextNode(); // Start typing
} else {
// Display user message immediately
messageDiv.innerHTML = message;
chatBox.appendChild(messageDiv);
chatBox.scrollTop = chatBox.scrollHeight;
}
}


// Function to clean and format chatbot responses
function formatBotResponse(rawText) {
// Replace bold and italic markers with nothing for a cleaner look
let formattedText = rawText.replace(/\*\*|__/g, '')  // Remove bold markers
                        .replace(/\*|_/g, '');   // Remove italic markers

// Convert **points** or bullet points into numbered lists
formattedText = formattedText.replace(/(\n|\r\n)?[-*]\s+/g, '\n• ');  // Replace bullets with "•"

// Add spacing between sections for better readability
formattedText = formattedText.replace(/(\n|\r\n){2,}/g, '\n\n');  // Ensure double newlines where necessary

return formattedText.trim();
}

// Modified chatbot response to include plant context
async function getChatbotResponse(userQuery) {
const apiKey = "AIzaSyDWnJQkKen11XtKj-GbEbk163IoVdvsQxA"; // Replace with your Gemini API key
const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Adding plant details to provide context
const plantDetails = currentPlant 
    ? `The plant is called "${currentPlant.commonName}" with the scientific name "${currentPlant.scientificName}". It belongs to the classification: ${currentPlant.classification}.`
    : "I don't have information about the specific plant yet.";

const prompt = `
    I am a plant care expert chatbot. Provide detailed care instructions and solutions for plant health issues.
    I provide information in a neet and clean way each message is betweent 100 to 120 words. I provide info in html format
    i return this format "
                    <p>
                    whenever need to write paragraph use p tag 
                    </p>
                    <h3>Use h3 tag for heading</h3>
                <ul>
                    <li><strong>Light: </strong> use strong tag in li tags to high light the keypoints</li>
                    <li><strong>Soil: </strong> keep your description simple</li>
                </ul>
                <p>In ending you can again use p tag to write conclusion or summary within 1 or 2 line of paragraph</p>"  
    ${plantDetails}
    User's question: "${userQuery}"
`;

const response = await fetch(`${apiUrl}?key=${apiKey}`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
    })
});

const data = await response.json();
return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure about that. Could you clarify your question?";
}

function setCurrentPlant(plantInfo) {
currentPlant = plantInfo;
}

function getLocation() {
return new Promise((resolve, reject) => {
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
    position => resolve(position),
    error => reject('Location access denied or unavailable.')
    );
} else {
    reject('Geolocation not supported by this browser.');
}
});
}

async function reverseGeocode(lat, lon) {
const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

try {
const response = await fetch(url);
const data = await response.json();

const locationName = data.address.city || data.address.town || data.address.village || data.address.state || data.address.country;
return locationName;
} catch (error) {
console.error('Reverse geocoding failed:', error);
return 'Unknown location';
}
}

async function getPlantInfoFromGPT(scientificName, location) {
  const gptApiKey = 'AIzaSyDWnJQkKen11XtKj-GbEbk163IoVdvsQxA';
  const gptApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  const prompt = `
      Provide the following details about the plant with the scientific name "${scientificName}" user searching this from ${location} if plant is not found here still give the provided details according to scientific name :
      1. Common Name
      2. Classification (Family, Genus)
      3. Average Life Span
      4. Usually Found Place 
      5. An Interesting Fact (in 1-2 sentences)

      If any information is not available, respond with "Info unavailable" for that section. Format the response as JSON **without extra text. provide only the json value**:
      {
          "common_name": "",
          "classification": {genus: 'genus name', family: 'family name', species: 'species name'},          
          "average_life_span": "",
          "usually_found_place": "",
          "interesting_fact": ""
      }
  `;

  const response = await fetch(`${gptApiUrl}?key=${gptApiKey}`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
      })
  });

  const gptData = await response.json();
  let responseText = gptData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  // Remove Markdown code blocks and "JSON" label
  responseText = responseText
      .replace(/```json|```/gi, '')  // Remove ```json and ```
      .replace(/^JSON\s*/i, '')      // Remove the word "JSON" if it appears at the start
      .trim();                       // Remove leading/trailing whitespace

  try {
      const plantInfo = JSON.parse(responseText);
      return plantInfo;
  } catch (error) {
      console.error('Error parsing GPT response:', error, responseText);
      return {
          common_name: "Info unavailable",
          classification: "Info unavailable",
          average_life_span: "Info unavailable",
          usually_found_place: "Info unavailable",
          interesting_fact: "Info unavailable"
      };
  }
}






});