//=============================================================================
// GroqNPC.js - Groq-Powered Dynamic NPC Engine for RPG Maker MZ
// Version: 2.2.0
// Changelog:
//   2.0.0 - Quest State Machine, NPC Knowledge Sharing, Enemy Behavior AI,
//            dynamic input prompt, structured AI response (DIALOGUE/PROMPT)
//   1.2.0 - Hybrid text formatting (semantic tags -> MZ color codes)
//   1.1.0 - Streaming API, 10s timeout, Train NPC Persona command
//   1.0.0 - Initial release
//=============================================================================
// LEGAL DISCLAIMER:
// Client-side calls to Groq API. You accept Groq ToS (https://groq.com/terms).
// Declare AI-generated content in your store listing (Steam policy).
// Author not liable for API costs or AI-generated content.
//=============================================================================

/*:
 * @target MZ
 * @plugindesc v2.2 | Groq AI Game Master - Dynamic NPCs, Quest Machine, Enemy Behavior
 * @author Rpx
 * @url https://gdschool.education/
 *
 * @help
 * ============================================================================
 * GROQ NPC ENGINE v2.0 - OVERVIEW
 * ============================================================================
 *
 * Four systems work together:
 *   LAYER 1 - AI Dialogue       Streaming NPC conversation, max 10s response
 *   LAYER 2 - Quest Machine     Define quests; all tagged NPCs share state
 *   LAYER 3 - NPC Knowledge     NPCs know quest status, companions, world state
 *   LAYER 4 - Enemy Behavior    AI decides enemy behavior, sets MZ Switches
 *
 * ============================================================================
 * QUICK START - DRAGON HUNTER QUEST EXAMPLE
 * ============================================================================
 *
 * 1. In a map autorun or quest-giver event:
 *    [Plugin Command] Define Quest
 *      ID: dragon_hunt | Title: The Dragon of Ashvale
 *      Objectives: Talk to Mark|Find the lair|Defeat the dragon
 *      Members: Mark,Sera,Old Tom | Quest Switch: 10
 *
 * 2. Mark's event (quest giver):
 *    [Plugin Command] Train NPC Persona
 *      Name: Mark | Role: questgiver | Quest ID: dragon_hunt
 *      Personality: You are Mark, veteran dragon hunter...
 *    [Plugin Command] Start AI Dialogue
 *
 * 3. Companion events (Sera, Old Tom):
 *    [Plugin Command] Train NPC Persona
 *      Role: companion | Quest ID: dragon_hunt
 *    [Plugin Command] Start AI Dialogue
 *
 * 4. Dragon enemy event (before battle):
 *    [Plugin Command] Evaluate Enemy Behavior
 *      Enemy: Ashvale Dragon | Quest ID: dragon_hunt
 *      Behavior Switch Base: 20
 *    [Conditional Branch] Switch 20 ON -> aggressive pattern
 *    [Conditional Branch] Switch 21 ON -> defensive pattern
 *    [Conditional Branch] Switch 22 ON -> flee
 *    [Conditional Branch] Switch 23 ON -> call reinforcements
 *    [Conditional Branch] Switch 24 ON -> enraged
 *
 * 5. Advance quest anywhere:
 *    [Plugin Command] Advance Quest Objective | Quest ID: dragon_hunt
 *
 * ============================================================================
 * NOTETAGS (Event Note field - overridden by Train NPC Persona command)
 * ============================================================================
 *
 * <AIPersona: [description]>
 * <AIGuardrails: [rules]>
 * <AIFallback: [message]>
 * <AIMaxTokens: [number]>
 * <AIQuestID: [questId]>
 * <AIRole: questgiver|companion|merchant|informant>
 *
 * ============================================================================
 * TEXT FORMATTING TAGS
 * ============================================================================
 *
 * AI wraps key words - plugin converts to MZ color codes:
 *   [important]...[/important]  -> Red    (dangers, warnings)
 *   [highlight]...[/highlight]  -> Yellow (names, places, items)
 *   [secret]...[/secret]        -> Green  (secrets, rare info)
 *   [weak]...[/weak]            -> Gray   (rumors, uncertain)
 *
 * ============================================================================
 * ENEMY BEHAVIOR SWITCHES (Base ID set in Evaluate Enemy Behavior command)
 * ============================================================================
 *
 *   Base+0  -> Aggressive  (full attack)
 *   Base+1  -> Defensive   (guard/buff)
 *   Base+2  -> Flee        (escape attempt)
 *   Base+3  -> Reinforce   (call allies)
 *   Base+4  -> Enraged     (quest-triggered berserk)
 *
 * Only ONE switch is ON at a time. Use Conditional Branch on each.
 *
 * ============================================================================
 *
 * @param apiKey
 * @text Groq API Key
 * @type string
 * @desc Get one at https://console.groq.com/keys
 * @default
 *
 * @param model
 * @text AI Model
 * @type combo
 * @option llama-3.1-8b-instant
 * @option llama-3.3-70b-versatile
 * @desc llama-3.1-8b-instant = fastest + cheapest. Recommended.
 * @default llama-3.1-8b-instant
 *
 * @param streamTimeout
 * @text Stream Timeout (seconds)
 * @type number
 * @min 3
 * @max 30
 * @desc Hard cutoff. Partial text shown if triggered.
 * @default 10
 *
 * @param maxMemory
 * @text Chat Memory (exchanges per NPC)
 * @type number
 * @min 1
 * @max 20
 * @default 4
 *
 * @param defaultInputPrompt
 * @text Default Input Prompt
 * @type string
 * @desc Fallback when AI does not generate a contextual prompt.
 * @default What do you say?
 *
 * @param maxInputLength
 * @text Max Player Input Length
 * @type number
 * @min 10
 * @max 200
 * @default 100
 *
 * @param globalSystemSuffix
 * @text Global System Prompt Suffix
 * @type multiline_string
 * @desc Appended to ALL NPC system prompts.
 * @default Keep responses under 3 sentences. Stay in character. Never mention being an AI.
 *
 * @param timeoutMessage
 * @text Timeout Fallback Message
 * @type string
 * @default Hmm... I need a moment to think.
 *
 * @param enableFormatting
 * @text Enable AI Text Formatting
 * @type boolean
 * @default true
 *
 * @param colorImportant
 * @text Color: [important]
 * @type number
 * @min -1
 * @max 31
 * @desc MZ color index. 2=red. -1=disabled.
 * @default 2
 *
 * @param colorHighlight
 * @text Color: [highlight]
 * @type number
 * @min -1
 * @max 31
 * @desc MZ color index. 14=yellow. -1=disabled.
 * @default 14
 *
 * @param colorSecret
 * @text Color: [secret]
 * @type number
 * @min -1
 * @max 31
 * @desc MZ color index. 3=green. -1=disabled.
 * @default 3
 *
 * @param colorWeak
 * @text Color: [weak]
 * @type number
 * @min -1
 * @max 31
 * @desc MZ color index. 8=gray. -1=disabled.
 * @default 8
 *
 * @param debugMode
 * @text Debug Mode
 * @type boolean
 * @desc Log full payloads to F8 console.
 * @default false
 *
 * @command testApiKey
 * @text Test API Connection
 * @desc Run this in any event to verify your API key works. Shows result in a message window.
 *
 * @command defineQuest
 * @text Define Quest
 * @desc Create/update a quest. All linked NPCs share this quest state.
 *
 * @arg questId
 * @text Quest ID
 * @type string
 * @desc Unique ID, no spaces. e.g. "dragon_hunt"
 * @default my_quest
 *
 * @arg title
 * @text Quest Title
 * @type string
 * @default The Quest
 *
 * @arg description
 * @text Quest Description
 * @type multiline_string
 * @default A quest to be completed.
 *
 * @arg objectives
 * @text Objectives (pipe-separated)
 * @type string
 * @desc e.g. "Find Mark|Reach the cave|Defeat the dragon"
 * @default Objective 1|Objective 2|Objective 3
 *
 * @arg npcMembers
 * @text NPC Members (comma-separated)
 * @type string
 * @desc Names of all NPCs involved. They all share quest knowledge.
 * @default NPC1,NPC2
 *
 * @arg questSwitch
 * @text Quest Active Switch ID
 * @type switch
 * @desc Set ON when quest is active. 0 = none.
 * @default 0
 *
 * @arg questVariable
 * @text Quest Progress Variable ID
 * @type variable
 * @desc Stores current objective index (0-based). 0 = none.
 * @default 0
 *
 * @command advanceObjective
 * @text Advance Quest Objective
 * @desc Mark current objective done, move to next.
 *
 * @arg questId
 * @text Quest ID
 * @type string
 * @default my_quest
 *
 * @command completeQuest
 * @text Complete Quest
 * @desc Mark quest as fully completed.
 *
 * @arg questId
 * @text Quest ID
 * @type string
 * @default my_quest
 *
 * @command failQuest
 * @text Fail Quest
 * @desc Mark quest as failed.
 *
 * @arg questId
 * @text Quest ID
 * @type string
 * @default my_quest
 *
 * @command trainPersona
 * @text Train NPC Persona
 * @desc Define NPC personality and quest link. Call BEFORE Start AI Dialogue.
 *
 * @arg name
 * @text NPC Name
 * @type string
 * @default Villager
 *
 * @arg personality
 * @text Personality & Background
 * @type multiline_string
 * @desc Role, traits, knowledge, speech style.
 * @default You are a friendly villager in a medieval fantasy town.
 *
 * @arg role
 * @text Quest Role
 * @type select
 * @option none
 * @option questgiver
 * @option companion
 * @option merchant
 * @option informant
 * @default none
 *
 * @arg questId
 * @text Quest ID (optional)
 * @type string
 * @desc Link this NPC to a quest. Leave empty for standalone.
 * @default
 *
 * @arg guardrails
 * @text Forbidden Topics
 * @type multiline_string
 * @default
 *
 * @arg fallbackMessage
 * @text Guardrail Fallback
 * @type string
 * @default I cannot speak of such things.
 *
 * @arg maxTokens
 * @text Max Response Tokens
 * @type number
 * @min 30
 * @max 400
 * @default 120
 *
 * @command startDialogue
 * @text Start AI Dialogue
 * @desc Begin AI conversation with this NPC.
 *
 * @command evaluateEnemyBehavior
 * @text Evaluate Enemy Behavior
 * @desc AI decides enemy behavior and sets MZ Switches.
 *
 * @arg enemyName
 * @text Enemy Name
 * @type string
 * @default Enemy
 *
 * @arg enemyDescription
 * @text Enemy Description
 * @type multiline_string
 * @desc Personality, lore, combat context.
 * @default A fierce monster guarding its territory.
 *
 * @arg questId
 * @text Quest ID (optional)
 * @type string
 * @default
 *
 * @arg behaviorSwitchBase
 * @text Behavior Switch Base ID
 * @type switch
 * @desc Base+0=Aggressive, Base+1=Defensive, Base+2=Flee, Base+3=Reinforce, Base+4=Enraged
 * @default 1
 *
 * @arg playerHpPercent
 * @text Player HP % Variable
 * @type variable
 * @desc Variable with player HP 0-100. 0 = not used.
 * @default 0
 *
 * @command setContextVar
 * @text Set Context Variable
 * @desc Expose a game variable or switch to all AI calls globally.
 *
 * @arg label
 * @text Label
 * @type string
 * @desc Human-readable name. e.g. "Player defeated the dragon"
 *
 * @arg variableId
 * @text Variable ID
 * @type variable
 *
 * @arg switchId
 * @text Switch ID
 * @type switch
 *
 * @command clearMemory
 * @text Clear NPC Memory
 * @desc Wipe this NPC's conversation history.
 *
 * @command clearAllMemory
 * @text Clear All NPC Memory
 * @desc Wipe ALL NPC conversation histories.
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "GroqNPC";
    const LOG_PREFIX  = "[GroqNPC]";
    const API_URL     = "https://api.groq.com/openai/v1/chat/completions";

    //=========================================================================
    // Config
    //=========================================================================
    const params = PluginManager.parameters(PLUGIN_NAME);
    // Parsing robusto: trim + gestione undefined/null
    const _rawKey = params["apiKey"] !== undefined ? String(params["apiKey"]).trim() : "";

    const Config = {
        apiKey        : _rawKey,
        model         : String(params.model              || "llama-3.1-8b-instant"),
        streamTimeout : Number(params.streamTimeout      || 10) * 1000,
        maxMemory     : Number(params.maxMemory          || 4),
        defaultPrompt : String(params.defaultInputPrompt || "What do you say?"),
        maxInputLen   : Number(params.maxInputLength     || 100),
        globalSuffix  : String(params.globalSystemSuffix || ""),
        timeoutMsg    : String(params.timeoutMessage     || "Hmm... I need a moment to think."),
        enableFmt     : params.enableFormatting          !== "false",
        colorImportant: Number(params.colorImportant     ?? 2),
        colorHighlight: Number(params.colorHighlight     ?? 14),
        colorSecret   : Number(params.colorSecret        ?? 3),
        colorWeak     : Number(params.colorWeak          ?? 8),
        debugMode     : params.debugMode                 === "true",
    };

    const log  = (...a) => { if (Config.debugMode) console.log(LOG_PREFIX, ...a); };
    const warn = (...a) => console.warn(LOG_PREFIX,  ...a);
    const lerr = (...a) => console.error(LOG_PREFIX, ...a);

    //=========================================================================
    // LAYER 2 - Quest State Machine
    //=========================================================================
    const _quests = {};

    function getQuest(id) { return _quests[id] || null; }

    function buildQuestContext(questId) {
        const q = getQuest(questId);
        if (!q) return "";
        const objectives = q.objectives.map((obj, i) => {
            const done = i < q.currentObjective;
            const cur  = i === q.currentObjective && q.status === "active";
            return `  ${done ? "DONE" : cur ? "CURRENT" : "PENDING"}: ${obj}`;
        }).join("\n");
        return `\n[QUEST: ${q.title}]
Status: ${q.status.toUpperCase()}
Description: ${q.description}
Objectives:\n${objectives}
Active objective: ${q.objectives[q.currentObjective] || "All complete"}
Quest members: ${q.npcMembers.join(", ")}`;
    }

    function advanceQuestObjective(questId) {
        const q = getQuest(questId);
        if (!q || q.status !== "active") return;
        q.currentObjective = Math.min(q.currentObjective + 1, q.objectives.length - 1);
        if (q.questVariable > 0) $gameVariables.setValue(q.questVariable, q.currentObjective);
        log("Quest advanced:", questId, "-> objective", q.currentObjective);
    }

    //=========================================================================
    // LAYER 3 - NPC Memory & Knowledge
    //=========================================================================
    const _npcMemory       = {};
    const _trainedPersonas = {};

    const memKey   = (m, e) => `${m}_${e}`;
    const getMem   = (m, e) => { const k = memKey(m,e); if (!_npcMemory[k]) _npcMemory[k]=[]; return _npcMemory[k]; };
    const clearMem = (m, e) => { _npcMemory[memKey(m,e)] = []; };

    function pushMem(mapId, evId, role, content) {
        const mem = getMem(mapId, evId);
        mem.push({ role, content: stripTags(content) });
        const max = Config.maxMemory * 2;
        while (mem.length > max) mem.shift();
    }

    //=========================================================================
    // Context Variables
    //=========================================================================
    const _ctxVars = [];

    function buildCtxString() {
        const lines = _ctxVars.map(cv => {
            if (cv.variableId > 0) return `${cv.label}: ${$gameVariables.value(cv.variableId)}`;
            if (cv.switchId   > 0) return `${cv.label}: ${$gameSwitches.value(cv.switchId) ? "true" : "false"}`;
            return null;
        }).filter(Boolean);
        return lines.length ? "\n[WORLD STATE]\n" + lines.join("\n") : "";
    }

    //=========================================================================
    // Notetag Parser
    //=========================================================================
    function parseNotetags(event) {
        const note = event.event().note || "";
        const get  = (tag, def) => { const m = note.match(new RegExp(`<${tag}:\\s*([^>]+)>`, "i")); return m ? m[1].trim() : def; };
        return {
            name      : get("AIName",      "NPC"),
            persona   : get("AIPersona",   "You are a villager in a fantasy RPG."),
            guardrails: get("AIGuardrails",""),
            fallback  : get("AIFallback",  "I cannot speak of such things."),
            maxTokens : Number(get("AIMaxTokens", "120")),
            questId   : get("AIQuestID",   ""),
            role      : get("AIRole",      "none"),
        };
    }

    //=========================================================================
    // System Prompt Builder
    //=========================================================================
    const ROLE_DESC = {
        questgiver: "You are the quest giver. Explain objectives, urgency, and reward clearly.",
        companion : "You are a companion in this quest. Share tips, morale, and quest details.",
        merchant  : "You are a merchant. Sell useful items and share quest-related rumors.",
        informant : "You are an informant. Share world information carefully and selectively.",
    };

    const FORMAT_INSTRUCTIONS = `
[TEXT FORMATTING - USE SPARINGLY, MAX 4 WORDS PER TAG]
[important]...[/important] = dangers, warnings, critical info
[highlight]...[/highlight] = item names, locations, proper nouns
[secret]...[/secret]       = secrets, rare knowledge, confidential
[weak]...[/weak]           = rumors, uncertain info, vague hints`;

    const RESPONSE_FORMAT = `
[MANDATORY RESPONSE FORMAT]
Reply using EXACTLY this structure, no exceptions:
DIALOGUE: <your in-character reply, 1-3 sentences>
PROMPT: <short question hint for player input, max 6 words>
Example:
DIALOGUE: The [highlight]Dragon of Ashvale[/highlight] sleeps near the [highlight]eastern caves[/highlight]. It is [important]extremely dangerous[/important].
PROMPT: Ask about the reward?`;

    function buildSysPrompt(tags) {
        let p = `You are ${tags.name}. ${tags.persona}`;

        if (ROLE_DESC[tags.role]) p += `\nRole: ${ROLE_DESC[tags.role]}`;

        if (tags.questId) {
            const qCtx = buildQuestContext(tags.questId);
            if (qCtx) p += qCtx;
        }

        if (tags.guardrails) {
            p += `\n[STRICT RULES]\n${tags.guardrails}`;
            p += `\nIf forbidden topic raised, say ONLY: "${tags.fallback}"`;
        }

        const ctx = buildCtxString();
        if (ctx) p += ctx;

        if (Config.enableFmt) p += FORMAT_INSTRUCTIONS;
        p += RESPONSE_FORMAT;
        if (Config.globalSuffix) p += "\n" + Config.globalSuffix;

        log("System prompt built for:", tags.name, "| quest:", tags.questId);
        log("Full prompt:", p);
        return p;
    }

    //=========================================================================
    // LAYER 4 - Enemy Behavior Evaluator
    //=========================================================================
    const ENEMY_BEHAVIORS = ["aggressive", "defensive", "flee", "reinforce", "enraged"];

    async function evaluateEnemyBehavior(enemyName, enemyDesc, questId, playerHpPct) {
        if (!Config.apiKey) {
            lerr("API key empty in evaluateEnemyBehavior. Raw:", params["apiKey"]);
            throw new Error("Groq API key not set. Check Plugin Manager.");
        }

        let sys = `You are an AI Game Master deciding enemy combat behavior.
Enemy: ${enemyName}
${enemyDesc ? "Description: " + enemyDesc : ""}`;

        if (questId) {
            const qCtx = buildQuestContext(questId);
            if (qCtx) sys += qCtx;
        }

        if (playerHpPct > 0) sys += `\nPlayer current HP: ${playerHpPct}%`;
        sys += buildCtxString();

        sys += `
[YOUR TASK]
Based on all context, choose ONE behavior for this enemy:
- aggressive: full attack, no mercy, player is manageable
- defensive:  protect self, use guards/buffs, buying time
- flee:       escape, enemy is outmatched or mission complete
- reinforce:  call for allies, enemy needs backup now
- enraged:    quest-triggered power surge, goes berserk (use when quest reaches climax)
Respond with ONLY one word. No punctuation, no explanation.`;

        const payload = {
            model     : Config.model,
            max_tokens: 5,
            stream    : false,
            messages  : [
                { role: "system", content: sys },
                { role: "user",   content: "Choose behavior." }
            ],
        };

        log("Enemy eval payload:", JSON.stringify(payload));

        const res = await fetch(API_URL, {
            method : "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Config.apiKey}` },
            body   : JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`Groq API ${res.status}`);
        const data     = await res.json();
        const behavior = (data.choices[0].message.content || "").trim().toLowerCase().split(/[\s\n]/)[0];
        const idx      = ENEMY_BEHAVIORS.indexOf(behavior);
        log(`Enemy "${enemyName}" behavior: "${behavior}" -> index ${idx >= 0 ? idx : 0}`);
        return idx >= 0 ? idx : 0;
    }

    //=========================================================================
    // Text Formatting
    //=========================================================================
    function stripTags(text) {
        return text
            .replace(/\[(important|highlight|secret|weak)\]([\s\S]*?)\[\/\1\]/gi, "$2")
            .replace(/\[(\/?)(?:important|highlight|secret|weak)\]/gi, "");
    }

    function convertTags(text) {
        if (!Config.enableFmt) return stripTags(text);
        const map = {
            important: Config.colorImportant,
            highlight: Config.colorHighlight,
            secret   : Config.colorSecret,
            weak     : Config.colorWeak,
        };
        let r = text;
        for (const [tag, idx] of Object.entries(map)) {
            if (idx < 0) {
                r = r.replace(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "gi"), "$1");
            } else {
                r = r.replace(
                    new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "gi"),
                    `\\C[${idx}]$1\\C[0]`
                );
            }
        }
        return r.replace(/\[(\/?)(?:important|highlight|secret|weak)\]/gi, "");
    }

    //=========================================================================
    // Structured Response Parser - DIALOGUE: / PROMPT:
    //=========================================================================
    function parseResponse(raw) {
        const dm = raw.match(/DIALOGUE:\s*([\s\S]*?)(?=\nPROMPT:|$)/i);
        const pm = raw.match(/PROMPT:\s*(.+)/i);
        return {
            dialogue: (dm ? dm[1] : raw).trim(),
            prompt  : (pm ? pm[1] : Config.defaultPrompt).trim(),
        };
    }

    //=========================================================================
    // Groq Streaming
    //=========================================================================
    async function callGroqStream(sysPrompt, messages, maxTokens) {
        if (!Config.apiKey) {
            const msg = `Groq API key is empty. Check Plugin Manager > GroqNPC > Groq API Key. Raw value: "${params["apiKey"]}"`;
            lerr(msg);
            throw new Error(msg);
        }

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), Config.streamTimeout);

        const payload = {
            model     : Config.model,
            max_tokens: maxTokens,
            stream    : true,
            messages  : [{ role: "system", content: sysPrompt }, ...messages],
        };

        let accumulated = "";

        try {
            const res = await fetch(API_URL, {
                method : "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Config.apiKey}` },
                body   : JSON.stringify(payload),
                signal : controller.signal,
            });

            if (!res.ok) {
                const ed = await res.json().catch(() => ({}));
                throw new Error(`Groq API ${res.status}: ${ed?.error?.message || res.statusText}`);
            }

            const reader  = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            outer: while (true) {
                let chunk;
                try   { chunk = await reader.read(); }
                catch (_) { log("Stream cut by timeout. Got:", accumulated); break outer; }

                if (chunk.done) break;

                for (const line of decoder.decode(chunk.value, { stream: true }).split("\n")) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") break outer;
                    try {
                        const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
                        if (delta) accumulated += delta;
                    } catch (_) {}
                }
            }

        } catch (e) {
            if (e.name !== "AbortError") { clearTimeout(timeoutId); throw e; }
            log("Fetch aborted (timeout).");
        }

        clearTimeout(timeoutId);
        return accumulated.trim() || Config.timeoutMsg;
    }

    //=========================================================================
    // Window_NpcInput - dynamic prompt text
    //=========================================================================
    class Window_NpcInput extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._text        = "";
            this._active      = false;
            this._prompt      = Config.defaultPrompt;
            this._cursorTimer = 0;
            this._cursorVis   = true;
            this._onConfirm   = null;
            this._onCancel    = null;
            this._boundKD     = this._onKeyDown.bind(this);
            this.openness     = 0;
        }

        activate(prompt, onConfirm, onCancel) {
            this._text      = "";
            this._prompt    = prompt || Config.defaultPrompt;
            this._active    = true;
            this._onConfirm = onConfirm;
            this._onCancel  = onCancel;
            this.open();
            this.refresh();
            document.addEventListener("keydown", this._boundKD, true);
        }

        deactivate() {
            this._active = false;
            document.removeEventListener("keydown", this._boundKD, true);
            this.close();
        }

        _onKeyDown(e) {
            if (!this._active) return;
            if (e.key === "Enter") {
                e.preventDefault(); e.stopPropagation();
                const t = this._text.trim();
                if (t) { this.deactivate(); this._onConfirm(t); }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault(); e.stopPropagation();
                this.deactivate(); this._onCancel();
                return;
            }
            if (e.key === "Backspace") {
                e.preventDefault();
                this._text = this._text.slice(0, -1);
                this.refresh();
                return;
            }
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                if (this._text.length < Config.maxInputLen) { this._text += e.key; this.refresh(); }
            }
        }

        update() {
            super.update();
            if (this._active && ++this._cursorTimer >= 30) {
                this._cursorTimer = 0;
                this._cursorVis   = !this._cursorVis;
                this.refresh();
            }
        }

        refresh() {
            this.contents.clear();
            const lh = this.lineHeight();
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(this._prompt, 0, 0, this.innerWidth, "left");
            this.resetTextColor();
            const cursor = this._cursorVis && this._active ? "|" : " ";
            this.drawText(this._text + cursor, 0, lh, this.innerWidth - 90, "left");
            this.changeTextColor(ColorManager.textColor(8));
            this.drawText(`${this._text.length}/${Config.maxInputLen}`, 0, lh, this.innerWidth, "right");
            this.resetTextColor();
            this.changeTextColor(ColorManager.textColor(7));
            this.drawText("[Enter] Send   [Esc] Leave", 0, lh * 2, this.innerWidth, "right");
            this.resetTextColor();
        }
    }

    //=========================================================================
    // Scene_Map - inject input window
    //=========================================================================
    const _origCreate = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _origCreate.call(this);
        const ww   = Graphics.boxWidth * 0.82;
        const wh   = this.calcWindowHeight(3, false);
        const rect = new Rectangle((Graphics.boxWidth - ww) / 2, Graphics.boxHeight - wh - 8, ww, wh);
        this._npcInputWindow = new Window_NpcInput(rect);
        this.addWindow(this._npcInputWindow);
    };

    const getInputWin = () => SceneManager._scene?._npcInputWindow || null;

    //=========================================================================
    // Plugin Commands
    //=========================================================================

    // --- Test API Connection (debug) ---
    PluginManager.registerCommand(PLUGIN_NAME, "testApiKey", function () {
        const interp = this;
        interp._waitCount = 9999;
        (async () => {
            const key = Config.apiKey;
            if (!key) {
                $gameMessage.clear();
                $gameMessage.add("[GroqNPC] API Key is EMPTY.");
                $gameMessage.add(`Raw param value: "${params["apiKey"]}"`);
                interp._waitCount = 0;
                return;
            }
            try {
                const res = await fetch(API_URL, {
                    method : "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                    body   : JSON.stringify({
                        model: Config.model, max_tokens: 5, stream: false,
                        messages: [{ role: "user", content: "Say OK" }]
                    }),
                });
                const data = await res.json();
                $gameMessage.clear();
                if (res.ok) {
                    $gameMessage.add("[GroqNPC] API OK! Key works.");
                    $gameMessage.add(`Model: ${Config.model}`);
                } else {
                    $gameMessage.add(`[GroqNPC] API ERROR ${res.status}`);
                    $gameMessage.add(data?.error?.message || "Unknown error");
                }
            } catch (e) {
                $gameMessage.clear();
                $gameMessage.add("[GroqNPC] Network error:");
                $gameMessage.add(e.message);
            }
            interp._waitCount = 0;
        })();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "defineQuest", function (args) {
        const id = String(args.questId || "").trim();
        if (!id) { warn("defineQuest: questId is empty."); return; }
        const switchId = Number(args.questSwitch   || 0);
        const varId    = Number(args.questVariable || 0);
        _quests[id] = {
            id,
            title           : String(args.title       || id),
            description     : String(args.description || ""),
            objectives      : String(args.objectives  || "").split("|").map(s => s.trim()).filter(Boolean),
            currentObjective: 0,
            status          : "active",
            npcMembers      : String(args.npcMembers  || "").split(",").map(s => s.trim()).filter(Boolean),
            questSwitch     : switchId,
            questVariable   : varId,
        };
        if (switchId > 0) $gameSwitches.setValue(switchId, true);
        if (varId    > 0) $gameVariables.setValue(varId, 0);
        log("Quest defined:", id, _quests[id]);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "advanceObjective", function (args) {
        advanceQuestObjective(String(args.questId || "").trim());
    });

    PluginManager.registerCommand(PLUGIN_NAME, "completeQuest", function (args) {
        const q = getQuest(String(args.questId || "").trim());
        if (!q) { warn("completeQuest: quest not found"); return; }
        q.status = "completed";
        q.currentObjective = q.objectives.length - 1;
        if (q.questSwitch > 0) $gameSwitches.setValue(q.questSwitch, false);
        log("Quest completed:", q.id);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "failQuest", function (args) {
        const q = getQuest(String(args.questId || "").trim());
        if (!q) { warn("failQuest: quest not found"); return; }
        q.status = "failed";
        if (q.questSwitch > 0) $gameSwitches.setValue(q.questSwitch, false);
        log("Quest failed:", q.id);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "trainPersona", function (args) {
        const k = memKey($gameMap.mapId(), this._eventId);
        _trainedPersonas[k] = {
            name      : String(args.name           || "NPC"),
            persona   : String(args.personality    || "You are a villager."),
            role      : String(args.role           || "none"),
            questId   : String(args.questId        || ""),
            guardrails: String(args.guardrails      || ""),
            fallback  : String(args.fallbackMessage || "I cannot speak of such things."),
            maxTokens : Number(args.maxTokens       || 120),
        };
        log("Persona trained:", _trainedPersonas[k].name, "| role:", _trainedPersonas[k].role, "| quest:", _trainedPersonas[k].questId);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "startDialogue", function () {
        const interp  = this;
        const event   = $gameMap.event(interp._eventId);
        const mapId   = $gameMap.mapId();
        const eventId = interp._eventId;

        if (!event) { warn("startDialogue: event not found. ID:", eventId); return; }

        const k    = memKey(mapId, eventId);
        const tags = _trainedPersonas[k] || parseNotetags(event);
        const sys  = buildSysPrompt(tags);

        interp._waitCount = 999999;

        (async () => {
            let active        = true;
            let currentPrompt = Config.defaultPrompt;

            while (active) {
                const input = await getPlayerInput(currentPrompt);
                if (input === null) break;

                pushMem(mapId, eventId, "user", input);

                let raw = "";
                try {
                    // +40 tokens headroom for DIALOGUE:/PROMPT: structure overhead
                    raw = await callGroqStream(sys, getMem(mapId, eventId), tags.maxTokens + 40);
                } catch (e) {
                    lerr("API error:", e.message);
                    raw = `DIALOGUE: [Connection error. Try again.]\nPROMPT: ${Config.defaultPrompt}`;
                }

                const { dialogue, prompt } = parseResponse(raw);
                currentPrompt = prompt;

                pushMem(mapId, eventId, "assistant", dialogue);
                await showMsg(convertTags(dialogue));
                active = await promptContinue();
            }

            interp._waitCount = 0;
        })();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "evaluateEnemyBehavior", function (args) {
        const interp     = this;
        const enemyName  = String(args.enemyName           || "Enemy");
        const enemyDesc  = String(args.enemyDescription    || "");
        const questId    = String(args.questId             || "");
        const baseSwitch = Number(args.behaviorSwitchBase  || 1);
        const hpVarId    = Number(args.playerHpPercent     || 0);
        const playerHp   = hpVarId > 0 ? $gameVariables.value(hpVarId) : 100;

        interp._waitCount = 9999;

        (async () => {
            let idx = 0;
            try   { idx = await evaluateEnemyBehavior(enemyName, enemyDesc, questId, playerHp); }
            catch (e) { lerr("Enemy eval error:", e.message); idx = 0; }

            for (let i = 0; i < ENEMY_BEHAVIORS.length; i++) {
                $gameSwitches.setValue(baseSwitch + i, i === idx);
            }

            log(`Enemy "${enemyName}" -> ${ENEMY_BEHAVIORS[idx]} (Switch ${baseSwitch + idx} = ON)`);
            interp._waitCount = 0;
        })();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setContextVar", function (args) {
        _ctxVars.push({
            label      : String(args.label      || ""),
            variableId : Number(args.variableId || 0),
            switchId   : Number(args.switchId   || 0),
        });
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearMemory", function () {
        clearMem($gameMap.mapId(), this._eventId);
        log("Memory cleared for event:", this._eventId);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearAllMemory", function () {
        Object.keys(_npcMemory).forEach(k => { _npcMemory[k] = []; });
        log("All NPC memory cleared.");
    });

    //=========================================================================
    // Async helpers
    //=========================================================================

    function getPlayerInput(prompt) {
        return new Promise(res => {
            const w = getInputWin();
            if (!w) { res(null); return; }
            w.activate(prompt, text => res(text), () => res(null));
        });
    }

    // Wraps text into lines of maxChars, then groups lines into pages of maxLines.
    // MZ message window shows ~4 lines, ~50 chars per line with default font.
    function wrapTextToPages(text, maxChars, maxLines) {
        // Step 1: word-wrap into lines
        const words = text.split(" ");
        const lines = [];
        let cur = "";
        for (const word of words) {
            const test = cur ? cur + " " + word : word;
            if (test.length > maxChars) {
                if (cur) lines.push(cur);
                cur = word;
            } else {
                cur = test;
            }
        }
        if (cur) lines.push(cur);

        // Step 2: group lines into pages
        const pages = [];
        for (let i = 0; i < lines.length; i += maxLines) {
            pages.push(lines.slice(i, i + maxLines).join("\n"));
        }
        return pages.length ? pages : [text];
    }

    function showMsg(text) {
        return new Promise(res => {
            $gameMessage.clear();
            // 50 chars per line, 4 lines per page - adjust if you use a larger font
            const pages = wrapTextToPages(text, 50, 4);
            pages.forEach(p => $gameMessage.add(p));
            const t = setInterval(() => {
                if (!$gameMessage.isBusy()) { clearInterval(t); res(); }
            }, 100);
        });
    }

    function promptContinue() {
        return new Promise(res => {
            $gameMessage.clear();
            $gameMessage.setChoices(["Continue", "Leave"], 0, 1);
            $gameMessage.setChoiceCallback(i => res(i === 0));
        });
    }

    // splitChunks removed in v2.1 - MZ handles word wrap natively

    //=========================================================================
    // Save / Load
    //=========================================================================
    const _origMake = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const c = _origMake.call(this);
        c.groqNpcMemory  = _npcMemory;
        c.groqPersonas   = _trainedPersonas;
        c.groqQuests     = _quests;
        c.groqCtxVars    = _ctxVars.slice();
        return c;
    };

    const _origExtract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (c) {
        _origExtract.call(this, c);
        if (c.groqNpcMemory) Object.assign(_npcMemory,       c.groqNpcMemory);
        if (c.groqPersonas)  Object.assign(_trainedPersonas, c.groqPersonas);
        if (c.groqQuests)    Object.assign(_quests,          c.groqQuests);
        if (c.groqCtxVars)   c.groqCtxVars.forEach(v => { if (!_ctxVars.find(x => x.label === v.label)) _ctxVars.push(v); });
    };

    log(`v2.2 loaded | model:${Config.model} | timeout:${Config.streamTimeout/1000}s | fmt:${Config.enableFmt} | debug:${Config.debugMode}`);
    log("API key present:", Config.apiKey.length > 0, "| length:", Config.apiKey.length);
    log("RAW params.apiKey:", JSON.stringify(params["apiKey"]));

})();