import os
from dotenv import load_dotenv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view
import requests

import google.generativeai as genai

load_dotenv()

class ChatAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_message = request.data.get("message", "")

        if not user_message:
            return Response({"error": "No message provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(user_message)

            reply = response.text
            return Response({"reply": reply})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)