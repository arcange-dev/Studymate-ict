/* StudyMate ICT — the AI provider catalogue.
   -----------------------------------------
   One place that knows where each provider's API lives, which protocol it
   speaks and where its docs are. The "add your API" panel builds its picker
   from this list, and js/local-ai.js uses the same metadata to choose the
   request shape, so a provider only has to be described once.

   Protocols
     openai     POST {base}/chat/completions with a Bearer key — the default,
                and what nearly every provider in the world speaks.
     anthropic  POST {base}/messages with x-api-key and anthropic-version.
     gemini     POST {base}/models/{model}:generateContent with x-goog-api-key.

   A browser can only call a provider that sends CORS headers. `cors` records
   what is known: "allowed", "blocked" (needs a server/proxy), "local" (runs on
   this machine, so it is reachable) and "unknown". Model names change often;
   every entry is a starting point the learner can edit.

   This file is a classic script (no modules) so the app still runs from
   file://. It makes no network request and holds no key.
*/
(function (root) {
  'use strict';

  var SM = (root.SM = root.SM || {});

  var GROUPS = [
    { id: 'global', name: 'Global providers' },
    { id: 'asia', name: 'Asia & China' },
    { id: 'platform', name: 'Cloud platforms & routers' },
    { id: 'local', name: 'Local & self-hosted' },
    { id: 'custom', name: 'Your own gateway' }
  ];

  function p(id, name, group, baseUrl, model, docs, extra) {
    var entry = {
      id: id,
      name: name,
      group: group,
      protocol: 'openai',
      baseUrl: baseUrl,
      model: model,
      docs: docs,
      cors: 'blocked',
      needsEdit: false,
      note: ''
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) { entry[key] = extra[key]; });
    }
    return entry;
  }

  var LIST = [
    /* ------------------------------------------------------------- global */
    p('openai', 'OpenAI', 'global', 'https://api.openai.com/v1', 'gpt-4o-mini',
      'https://platform.openai.com/docs/api-reference/chat', { cors: 'unknown' }),
    p('anthropic', 'Anthropic Claude', 'global', 'https://api.anthropic.com/v1', 'claude-sonnet-4-5',
      'https://docs.anthropic.com/en/api/messages', {
        protocol: 'anthropic',
        cors: 'allowed',
        note: 'Claude uses its own Messages API. StudyMate sends the browser-access header Anthropic requires for direct calls.'
      }),
    p('gemini', 'Google Gemini', 'global', 'https://generativelanguage.googleapis.com/v1beta', 'gemini-2.5-flash',
      'https://ai.google.dev/api/generate-content', {
        protocol: 'gemini',
        cors: 'allowed',
        note: 'Uses the native Gemini API. The key is sent as x-goog-api-key, not as a Bearer token.'
      }),
    p('openrouter', 'OpenRouter (hundreds of models)', 'global', 'https://openrouter.ai/api/v1', 'openai/gpt-4o-mini',
      'https://openrouter.ai/docs/quickstart', { cors: 'allowed' }),
    p('groq', 'Groq (very fast inference)', 'global', 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile',
      'https://console.groq.com/docs/openai', { cors: 'allowed' }),
    p('mistral', 'Mistral AI', 'global', 'https://api.mistral.ai/v1', 'mistral-small-latest',
      'https://docs.mistral.ai/api/', { cors: 'unknown' }),
    p('deepseek', 'DeepSeek', 'global', 'https://api.deepseek.com/v1', 'deepseek-chat',
      'https://api-docs.deepseek.com/', { cors: 'unknown' }),
    p('together', 'Together AI', 'global', 'https://api.together.xyz/v1', 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'https://docs.together.ai/docs/openai-api-compatibility', { cors: 'unknown' }),
    p('fireworks', 'Fireworks AI', 'global', 'https://api.fireworks.ai/inference/v1', 'accounts/fireworks/models/llama-v3p3-70b-instruct',
      'https://docs.fireworks.ai/api-reference/introduction', { cors: 'unknown' }),
    p('perplexity', 'Perplexity (web-grounded)', 'global', 'https://api.perplexity.ai', 'sonar',
      'https://docs.perplexity.ai/api-reference/chat-completions', { cors: 'unknown' }),
    p('xai', 'xAI Grok', 'global', 'https://api.x.ai/v1', 'grok-3-mini',
      'https://docs.x.ai/docs/api-reference', { cors: 'unknown' }),
    p('cohere', 'Cohere', 'global', 'https://api.cohere.ai/compatibility/v1', 'command-r-plus-08-2024',
      'https://docs.cohere.com/docs/compatibility-api', { cors: 'unknown' }),
    p('cerebras', 'Cerebras', 'global', 'https://api.cerebras.ai/v1', 'llama3.3-70b',
      'https://inference-docs.cerebras.ai/api-reference', { cors: 'unknown' }),
    p('sambanova', 'SambaNova Cloud', 'global', 'https://api.sambanova.ai/v1', 'Meta-Llama-3.3-70B-Instruct',
      'https://docs.sambanova.ai/cloud/docs/get-started/overview', { cors: 'unknown' }),
    p('deepinfra', 'DeepInfra', 'global', 'https://api.deepinfra.com/v1/openai', 'meta-llama/Llama-3.3-70B-Instruct',
      'https://deepinfra.com/docs/openai_api', { cors: 'unknown' }),
    p('novita', 'Novita AI', 'global', 'https://api.novita.ai/v3/openai', 'meta-llama/llama-3.3-70b-instruct',
      'https://novita.ai/docs/api-reference/openai-api', { cors: 'unknown' }),
    p('hyperbolic', 'Hyperbolic', 'global', 'https://api.hyperbolic.xyz/v1', 'meta-llama/Llama-3.3-70B-Instruct',
      'https://docs.hyperbolic.xyz/docs/openai-api', { cors: 'unknown' }),
    p('nebius', 'Nebius AI Studio', 'global', 'https://api.studio.nebius.com/v1', 'meta-llama/Llama-3.3-70B-Instruct',
      'https://docs.nebius.com/studio/api', { cors: 'unknown' }),
    p('nvidia', 'NVIDIA NIM', 'global', 'https://integrate.api.nvidia.com/v1', 'meta/llama-3.3-70b-instruct',
      'https://docs.api.nvidia.com/nim/reference/llm-apis', { cors: 'unknown' }),
    p('ai21', 'AI21 Labs', 'global', 'https://api.ai21.com/studio/v1', 'jamba-large-1.7',
      'https://docs.ai21.com/reference/chat-completions', { cors: 'unknown' }),
    p('writer', 'Writer (Palmyra)', 'global', 'https://api.writer.com/v1', 'palmyra-x-004',
      'https://dev.writer.com/api-reference/chat-api', { cors: 'unknown' }),
    p('huggingface', 'Hugging Face Inference', 'global', 'https://router.huggingface.co/v1', 'meta-llama/Llama-3.3-70B-Instruct',
      'https://huggingface.co/docs/inference-providers', { cors: 'unknown' }),
    p('scaleway', 'Scaleway Generative APIs', 'global', 'https://api.scaleway.ai/v1', 'llama-3.3-70b-instruct',
      'https://www.scaleway.com/en/docs/generative-apis/', { cors: 'unknown' }),
    p('ovhcloud', 'OVHcloud AI Endpoints', 'global', 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1', 'Meta-Llama-3_3-70B-Instruct',
      'https://help.ovhcloud.com/csm/en-public-cloud-ai-endpoints', { cors: 'unknown' }),
    p('github', 'GitHub Models', 'global', 'https://models.github.ai/inference', 'openai/gpt-4o-mini',
      'https://docs.github.com/en/rest/models/inference', { cors: 'unknown' }),

    /* --------------------------------------------------------------- asia */
    p('moonshot', 'Moonshot AI (Kimi)', 'asia', 'https://api.moonshot.ai/v1', 'kimi-latest',
      'https://platform.moonshot.ai/docs/api/chat', { cors: 'unknown' }),
    p('zai', 'Z.ai (GLM)', 'asia', 'https://api.z.ai/api/paas/v4', 'glm-4.6',
      'https://docs.z.ai/api-reference/llm/chat-completion', { cors: 'unknown' }),
    p('dashscope', 'Alibaba Qwen (DashScope)', 'asia', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', 'qwen-plus',
      'https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope', { cors: 'unknown' }),
    p('siliconflow', 'SiliconFlow', 'asia', 'https://api.siliconflow.cn/v1', 'Qwen/Qwen2.5-7B-Instruct',
      'https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions', { cors: 'unknown' }),
    p('yi', '01.AI (Yi)', 'asia', 'https://api.lingyiwanwu.com/v1', 'yi-lightning',
      'https://platform.lingyiwanwu.com/docs', { cors: 'unknown' }),
    p('baichuan', 'Baichuan AI', 'asia', 'https://api.baichuan-ai.com/v1', 'Baichuan4',
      'https://platform.baichuan-ai.com/docs/api', { cors: 'unknown' }),
    p('stepfun', 'StepFun', 'asia', 'https://api.stepfun.com/v1', 'step-2-mini',
      'https://platform.stepfun.com/docs/llm/chat', { cors: 'unknown' }),
    p('minimax', 'MiniMax', 'asia', 'https://api.minimax.chat/v1', 'abab6.5s-chat',
      'https://www.minimax.io/platform/document/ChatCompletion%20v2', { cors: 'unknown' }),
    p('hunyuan', 'Tencent Hunyuan', 'asia', 'https://api.hunyuan.cloud.tencent.com/v1', 'hunyuan-turbo',
      'https://cloud.tencent.com/document/product/1729/111007', { cors: 'unknown' }),
    p('doubao', 'ByteDance Doubao (Ark)', 'asia', 'https://ark.cn-beijing.volces.com/api/v3', 'doubao-1-5-pro-32k-250115',
      'https://www.volcengine.com/docs/82379/1298454', { cors: 'unknown' }),
    p('upstage', 'Upstage Solar', 'asia', 'https://api.upstage.ai/v1/solar', 'solar-pro',
      'https://developers.upstage.ai/docs/apis/chat', { cors: 'unknown' }),
    p('sarvam', 'Sarvam AI (Indic)', 'asia', 'https://api.sarvam.ai/v1', 'sarvam-m',
      'https://docs.sarvam.ai/api-reference-docs/chat/completions', { cors: 'unknown' }),

    /* ----------------------------------------------------------- platform */
    p('azure', 'Azure OpenAI', 'platform', 'https://YOUR-RESOURCE.openai.azure.com/openai/v1', 'gpt-4o-mini',
      'https://learn.microsoft.com/azure/ai-services/openai/reference', {
        needsEdit: true,
        note: 'Replace YOUR-RESOURCE with your Azure resource name. Your deployment name goes in the Model field.'
      }),
    p('cloudflare', 'Cloudflare Workers AI', 'platform', 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1', '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      'https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/', {
        needsEdit: true,
        cors: 'unknown',
        note: 'Replace YOUR_ACCOUNT_ID with your Cloudflare account ID, and use an API token with Workers AI permission.'
      }),
    p('openrouter-free', 'OpenRouter free models', 'platform', 'https://openrouter.ai/api/v1', 'meta-llama/llama-3.3-70b-instruct:free',
      'https://openrouter.ai/models?max_price=0', {
        cors: 'allowed',
        note: 'OpenRouter publishes free models; they are rate limited but need no payment method.'
      }),

    /* -------------------------------------------------------------- local */
    p('ollama', 'Ollama (this computer)', 'local', 'http://localhost:11434/v1', 'llama3.2',
      'https://github.com/ollama/ollama/blob/main/docs/openai.md', {
        cors: 'local',
        note: 'Run “ollama serve” first. Any key works — Ollama does not check it.'
      }),
    p('lmstudio', 'LM Studio (this computer)', 'local', 'http://localhost:1234/v1', 'local-model',
      'https://lmstudio.ai/docs/app/api/endpoints/openai', {
        cors: 'local',
        note: 'Start the LM Studio local server, then use the model name it shows.'
      }),
    p('llamacpp', 'llama.cpp server', 'local', 'http://localhost:8080/v1', 'local-model',
      'https://github.com/ggml-org/llama.cpp/tree/master/tools/server', { cors: 'local' }),
    p('vllm', 'vLLM server', 'local', 'http://localhost:8000/v1', 'local-model',
      'https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html', { cors: 'local' }),
    p('jan', 'Jan (this computer)', 'local', 'http://localhost:1337/v1', 'local-model',
      'https://jan.ai/docs/desktop/api-server', { cors: 'local' }),
    p('textgen', 'text-generation-webui', 'local', 'http://localhost:5000/v1', 'local-model',
      'https://github.com/oobabooga/text-generation-webui/wiki/12-%E2%80%90-OpenAI-API', { cors: 'local' }),

    /* ------------------------------------------------------------- custom */
    p('custom', 'Other provider — enter its base URL', 'custom', '', '',
      'https://platform.openai.com/docs/api-reference/chat', {
        cors: 'unknown',
        note: 'Any endpoint that implements POST {base}/chat/completions works. Paste its API root, not the /chat/completions part.'
      })
  ];

  /* ---------------------------------------------------------------- helpers */

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function byId(id) {
    var wanted = clean(id).toLowerCase();
    for (var i = 0; i < LIST.length; i += 1) {
      if (LIST[i].id === wanted) return LIST[i];
    }
    return null;
  }

  /** Trim a base URL to the API root: no trailing slash, no /chat/completions. */
  function normalizeBase(url) {
    var value = clean(url);
    if (!value) return '';
    value = value.replace(/\/+$/, '');
    value = value.replace(/\/(chat\/completions|completions|messages)$/i, '');
    value = value.replace(/:generateContent$/i, '');
    // A pasted ".../models" is the model list, not a chat root.
    value = value.replace(/\/models$/i, '');
    return value.replace(/\/+$/, '');
  }

  function isHttpUrl(url) {
    var value = clean(url);
    return /^https:\/\/[^\s]+$/i.test(value)
      || /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(value);
  }

  /** Which known provider owns this base URL? Returns the entry or null. */
  function detect(url) {
    var base = normalizeBase(url).toLowerCase();
    if (!base) return null;
    var best = null;
    LIST.forEach(function (provider) {
      if (!provider.baseUrl || provider.needsEdit) return;
      var candidate = normalizeBase(provider.baseUrl).toLowerCase();
      if (!candidate) return;
      if (base === candidate) {
        if (!best || candidate.length > normalizeBase(best.baseUrl).length) best = provider;
        return;
      }
      if (base.indexOf(candidate + '/') === 0) {
        if (!best || candidate.length > normalizeBase(best.baseUrl).length) best = provider;
      }
    });
    return best;
  }

  function chatUrl(providerOrBase, protocol, model) {
    var base = typeof providerOrBase === 'string' ? normalizeBase(providerOrBase) : normalizeBase(providerOrBase.baseUrl);
    var proto = protocol || (providerOrBase && providerOrBase.protocol) || 'openai';
    if (proto === 'anthropic') return base + '/messages';
    if (proto === 'gemini') {
      // Gemini accepts either "gemini-2.5-flash" or "models/gemini-2.5-flash".
      var name = clean(model).replace(/^models\//i, '');
      return base + '/models/' + encodeURIComponent(name) + ':generateContent';
    }
    return base + '/chat/completions';
  }

  function modelsUrl(providerOrBase, protocol) {
    var base = typeof providerOrBase === 'string' ? normalizeBase(providerOrBase) : normalizeBase(providerOrBase.baseUrl);
    var proto = protocol || (providerOrBase && providerOrBase.protocol) || 'openai';
    return base + '/models';
  }

  /** Free-text search over id, name, group and note. */
  function search(query) {
    var q = clean(query).toLowerCase();
    if (!q) return LIST.slice();
    return LIST.filter(function (provider) {
      var haystack = [provider.id, provider.name, provider.group, provider.model, provider.note].join(' ').toLowerCase();
      return q.split(/\s+/).every(function (word) { return haystack.indexOf(word) !== -1; });
    });
  }

  function grouped() {
    return GROUPS.map(function (group) {
      return {
        id: group.id,
        name: group.name,
        providers: LIST.filter(function (provider) { return provider.group === group.id; })
      };
    }).filter(function (group) { return group.providers.length > 0; });
  }

  function count() {
    return LIST.length;
  }

  SM.providers = {
    list: LIST,
    groups: GROUPS,
    count: count,
    get: byId,
    detect: detect,
    normalizeBase: normalizeBase,
    isHttpUrl: isHttpUrl,
    chatUrl: chatUrl,
    modelsUrl: modelsUrl,
    search: search,
    grouped: grouped
  };
})(typeof window !== 'undefined' ? window : globalThis);
