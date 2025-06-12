// fetch chat response from the backend

export async function getLaundryTip(message: string, language: string = 'en') {
    try {
      const response = await fetch("http://192.168.100.113:8000/api/chat/", { // manual IP modification
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message,
          language 
        }),
      });
  
      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error("Error fetching chat response:", error);
      return language === 'ro' 
        ? "Ups! Ceva nu a mers bine."
        : "Oops! Something went wrong.";
    }
  }