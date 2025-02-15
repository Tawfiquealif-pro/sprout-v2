const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const identifyButton = document.getElementById('identifyButton');
const resultDiv = document.getElementById('result');
let currentPlant = null;
let selectedImage = null;



// Display the selected image
imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Plant Image">`;
    }
    reader.readAsDataURL(file);
    selectedImage = file;
    console.log(file)
  }
});

const apiKey = 'iXZUY7Ac8MrLYHCxF39KhPmiHPWFUohe9YYktOxRZgYhpxuPW0';
const apiUrl = 'https://api.plant.id/v2/identify';

identifyButton.addEventListener('click', async () => {
    if (!selectedImage) {
      alert('Please upload an image first!');
      return;
    }
  
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '🔍 Identifying the plant...';
  
    const formData = new FormData();
    formData.append('images', selectedImage);
    formData.append('organs', 'leaf');
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
        },
        body: formData
      });
  
      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        const plantInfo = data.suggestions[0];
        const plantName = plantInfo.plant_name;
        const scientificName = plantInfo.plant_details?.scientific_name || 'Scientific name not available';
        let commonNames = plantInfo.plant_details?.common_names;
  
        // If no common names, use GPT API
        if (!commonNames || commonNames.length === 0) {
          resultDiv.innerHTML += '<p>🌍 Fetching local common names based on your location...</p>';
  
          try {
            const position = await getLocation();
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
  
            // Reverse geocode coordinates to get location name
            const locationName = await reverseGeocode(lat, lon);
  
            // Now send the readable location to GPT
            const gptCommonName = await getCommonNameFromGPT(scientificName, locationName);
            commonNames = [gptCommonName];
          } catch (locationError) {
            console.warn(locationError);
            commonNames = ['Common names unavailable.'];
          }
        }
  
        const commonNamesText = commonNames.join(', ');
  
        // Displaying plant information
        resultDiv.innerHTML = `
          <h2>🌱 ${plantName}</h2>
          <p><strong>Scientific Name:</strong> ${scientificName}</p>
          <p><strong>Common Names:</strong> ${commonNamesText}</p>
        `;
        PLANT = {
            commonName:commonNamesText,
            scientificName:scientificName,
            classification: null,
        }
        setCurrentPlant(PLANT)
        CHATBOX = document.getElementById('chat-container')
        CHATBOX.style.display = 'flex'
      } else {
        resultDiv.innerHTML = '❌ No plant identified. Please try another image.';
      }
  
    } catch (error) {
      console.error(error);
      resultDiv.innerHTML = '❌ Failed to identify the plant. Please try again.';
    }
  });
  
  

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

  async function getCommonNameFromGPT(scientificName, location) {
    const gptApiKey = 'AIzaSyDWnJQkKen11XtKj-GbEbk163IoVdvsQxA';
    const gptApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
    const prompt = `What is the local or common name for the plant with the scientific name "${scientificName}" in ${location}? `;
  
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
    const commonName = gptData.candidates?.[0]?.content?.parts?.[0]?.text || 'Common name not found via GPT.';
    return commonName;
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
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("pre");
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
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