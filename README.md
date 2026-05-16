
---

## 🧠 Enemy Behavior Switches

When you set `Behavior Switch Base: 20`:

| Switch | Behavior | When AI chooses it |
|--------|----------|---------------------|
| 20 | Aggressive | Player is manageable, enemy has advantage |
| 21 | Defensive | Enemy protecting something, buying time |
| 22 | Flee | Enemy outmatched or mission complete |
| 23 | Reinforce | Enemy needs backup NOW |
| 24 | Enraged | Quest climax, berserk mode |

**Only ONE switch is ON at a time.**

---

## 💾 Save Data

The plugin automatically saves:
- Conversation histories
- Trained NPC personas
- Quest states
- Context variables

Everything persists through save/load.

---

## ⚠️ Legal & Limitations

### Legal Disclaimer

- Client-side calls to Groq API. You accept Groq ToS (https://groq.com/terms)
- Declare AI-generated content in your store listing (Steam policy)
- Author not liable for API costs or AI-generated content

### Technical Limitations

| Issue | Details |
|-------|---------|
| **API key visibility** | Client-side calls mean the key is visible to players |
| **Internet required** | AI features need an active connection |
| **API costs** | You pay for usage (Groq is very cheap) |
| **No ongoing development** | I won't maintain or update this plugin |

---

## 🔧 Troubleshooting

### "API key is empty"

- Check Plugin Manager → GroqNPC → Groq API Key
- Key should start with `gsk_`
- No spaces before or after

### Timeout errors

- Increase `Stream Timeout` to 15 seconds
- Switch to `llama-3.1-8b-instant` model

### NPC doesn't remember quest

- Ensure `Quest ID` matches exactly (case-sensitive)
- Call `trainPersona` BEFORE `startDialogue`
- Define the quest first with `defineQuest`

### Test your API key

Use the plugin command `testApiKey` in any event.

---

## 📄 License

**MIT License** – do whatever you want with this code.

No credit required. No warranty. No support.

---

## 🙏 Credits

- [Groq](https://groq.com) – Fast LLM API
- RPG Maker MZ – By Gotcha Gotcha Games

---

## 💬 Final Notes

I made this for fun. It works as-is. I won't fix bugs or add features.

Take it, break it, improve it, sell games with it.

**Enjoy!**
