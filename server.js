const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "12mb" }));

// Statik fayllarni (index.html va boshqalar) public papkasidan xizmat qiladi
app.use(express.static(path.join(__dirname, "public")));

// AI tahlil so'rovini xavfsiz qabul qiladigan yo'l.
// API kalit faqat shu yerda, serverda ishlatiladi — brauzerga hech qachon chiqmaydi.
app.post("/api/analyze", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY sozlanmagan. Render'da Environment bo'limiga uni qo'shing va qayta deploy qiling."
    });
  }

  const { image, mediaType, systemPrompt, userText } = req.body || {};
  if (!image || !mediaType) {
    return res.status(400).json({ error: "Rasm ma'lumotlari yetarli emas" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
              { type: "text", text: userText || "Ushbu o'simlik/barg/meva/tana suratini tahlil qiling va ro'yxat asosida tashxis qo'ying." }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Anthropic API xatoligi" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Boshqa barcha so'rovlar uchun asosiy sahifani qaytaradi
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi, port:", PORT);
});
