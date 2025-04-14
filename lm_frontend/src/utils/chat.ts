export async function getLaundryTip(message: string) {
    try {
      const response = await fetch("http://192.168.100.98:8000/api/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
  
      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error("Error fetching chat response:", error);
      return "Oops! Something went wrong.";
    }
  }