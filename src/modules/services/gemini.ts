import { getPref, transformPromptWithContext } from "../../utils";
import { TranslateService } from "./base";
import type { TranslateTask } from "../../utils/task";
import {
  buildSystemPrompt,
  postProcessAbbreviationConsistency,
  findMatchingAbbreviations,
  loadCustomGlossary,
  getPaperContext,
  translationCache,
  saveCache,
} from "./medical-core";

const translate = <TranslateService["translate"]>async function (data) {
  const apiURL = getPref("gemini.endPoint") as string;
  const model = getPref("gemini.model") as string || "gemini-2.5-flash-lite";

  // === 医学翻译增强：缓存检查 ===
  const cacheKey = `${data.raw}|${data.langfrom || "en"}|${data.langto || "zh-CN"}|${model}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    cached.timestamp = Date.now();
    data.result = cached.result;
    data.status = "success";
    return;
  }

  const paperContext = getPaperContext(data.itemId);
  const customGlossary = loadCustomGlossary();
  const customPrompt = (getPref("gemini.prompt") as string) || "";

  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    if (customPrompt) {
      return transformPromptWithContext(
        "gemini.prompt",
        langFrom,
        langTo,
        sourceText,
        data,
      );
    }
    const systemPrompt = buildSystemPrompt(sourceText, paperContext, customGlossary);
    return `${systemPrompt}\n\n请翻译以下英文医学文献段落：\n\n${sourceText}`;
  }

  function getGenContentAPI(data: Required<TranslateTask>) {
    const stream = getPref("gemini.stream") as boolean;
    if (stream) {
      return apiURL + `:streamGenerateContent?alt=sse&key=${data.secret}`;
    } else {
      return apiURL + `:generateContent?key=${data.secret}`;
    }
  }

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  const xhr = await Zotero.HTTP.request("POST", getGenContentAPI(data), {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: transformContent(data.langfrom, data.langto, data.raw),
            },
          ],
        },
      ],
    }),
    responseType: "text",
    requestObserver: (xmlhttp: XMLHttpRequest) => {
      let preLength = 0;
      let result = "";
      xmlhttp.onprogress = (e: any) => {
        // Only concatenate the new strings
        const newResponse = e.target.response.slice(preLength);
        const dataArray = newResponse.split("data: ");

        for (const data of dataArray) {
          if (data) {
            result +=
              JSON.parse(data).candidates[0].content.parts[0].text || "";
          }
        }

        // Clear timeouts caused by stream transfers
        if (e.target.timeout) {
          e.target.timeout = 0;
        }

        data.result = result;
        preLength = e.target.response.length;

        refreshHandler();
      };
    },
  });
  if (xhr?.status !== 200) {
    data.status = "fail";
    throw `Request error: ${xhr?.status}`;
  }

  // === 医学翻译后处理 ===
  if (!customPrompt) {
    const matchedAbbrs = findMatchingAbbreviations(data.raw, paperContext);
    data.result = postProcessAbbreviationConsistency(
      data.result,
      matchedAbbrs,
      customGlossary,
    );
  }

  // 缓存结果
  data.status = "success";
  translationCache.set(cacheKey, {
    result: data.result,
    timestamp: Date.now(),
  });
  saveCache(translationCache);
};

export const Gemini: TranslateService = {
  id: "gemini",
  type: "sentence",
  helpUrl: "https://ai.google.dev/gemini-api/docs",

  defaultSecret: "",
  secretValidator(secret: string) {
    const flag = Boolean(secret);
    return {
      secret,
      status: flag,
      info: flag ? "" : "The secret is not set.",
    };
  },

  translate,

  config(settings) {
    settings
      .addTextSetting({
        prefKey: "gemini.endPoint",
        nameKey: "service-gemini-dialog-endPoint",
      })
      .addTextAreaSetting({
        prefKey: "gemini.prompt",
        nameKey: "service-gemini-dialog-prompt",
      })
      .addCheckboxSetting({
        prefKey: "gemini.stream",
        nameKey: "service-gemini-dialog-stream",
      });
  },
};
