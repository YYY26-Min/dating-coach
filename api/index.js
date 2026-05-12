// 相亲对话分析 — Vercel Serverless

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>相亲对话分析</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;color:#333;min-height:100vh}
.header{background:#fff;padding:16px 20px;text-align:center;border-bottom:1px solid #eee}
.header h1{font-size:18px;font-weight:600}
.header p{font-size:13px;color:#999;margin-top:4px}
.container{padding:16px;max-width:640px;margin:0 auto}
.section{margin-bottom:16px}
.label{font-size:14px;font-weight:500;margin-bottom:8px;display:block;color:#555}
textarea{width:100%;min-height:180px;padding:12px;font-size:15px;border:1px solid #ddd;border-radius:10px;resize:vertical;line-height:1.6;font-family:inherit;background:#fff}
textarea:focus{outline:none;border-color:#e8636b}
.btn{width:100%;padding:14px;font-size:16px;font-weight:600;background:#e8636b;color:#fff;border:none;border-radius:10px;cursor:pointer;letter-spacing:1px}
.btn:active{opacity:.85}
.btn:disabled{background:#ccc}
.result{background:#fff;border-radius:10px;padding:16px;line-height:1.8;font-size:15px;white-space:pre-wrap;word-break:break-word;border:1px solid #eee}
.result:empty{display:none}
.result strong{color:#e8636b}
.loading{text-align:center;padding:24px;color:#999;font-size:14px}
.error{background:#fff3f3;color:#c0392b;padding:12px;border-radius:8px;font-size:14px}
.disclaimer{font-size:11px;color:#bbb;text-align:center;padding:20px;line-height:1.6}
.hint{font-size:13px;color:#aaa;margin-top:6px}
</style>
</head>
<body>
<div class="header"><h1>相亲对话分析</h1><p>每条判断有出处 · 不灌鸡汤只讲依据</p></div>
<div class="container">
<div class="section"><span class="label">把对话粘贴进来</span>
<textarea id="input" placeholder="直接把微信聊天记录复制粘贴到这里...&#10;比如：&#10;她：最近在忙什么&#10;你：刚下班累死了&#10;她：那你早点休息&#10;你：嗯嗯"></textarea>
<div class="hint">你的对话不会存储到服务器</div></div>
<div class="section"><button class="btn" id="btn" onclick="run()">开始分析</button></div>
<div id="out"></div></div>
<div class="disclaimer">分析基于学术研究，每条判断标注来源<br>AI 生成仅供参考</div>
<script>
async function run(){
var t=document.getElementById("input").value.trim();
var b=document.getElementById("btn");
var o=document.getElementById("out");
if(t.length<10){o.innerHTML='<div class="error">对话太短，至少写10个字</div>';return}
b.disabled=true;b.textContent="分析中...";
o.innerHTML='<div class="loading">正在分析...</div>';
try{
var r=await fetch("/api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({c:t})});
var d=await r.json();
if(d.error){o.innerHTML='<div class="error">'+d.error+'</div>'}
else{var h=d.result.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\*\\*(.+?)\\*\\*/g,"<strong>$1</strong>");o.innerHTML='<div class="result">'+h+'</div>'}
}catch(e){o.innerHTML='<div class="error">网络错误，稍后重试</div>'}
b.disabled=false;b.textContent="开始分析"}
</script>
</body>
</html>`;

const PROMPT = `你是一个相亲策略顾问，基于心理学和社会学研究提供分析。你不是情感鸡汤写手。

## 铁律：每条判断必须有出处
每个分析结论必须带来源标签：
[学术] 来自已发表研究，写明具体理论
[数据] 来自最新调查统计
[推理] 基于本案例逻辑推断，必须写推理链条
没有出处不下判断。分析结尾必须写可信度总结。

## 输出格式
逐句拆解 → 整体判断 → 回复建议 → 止损判断（如适用）
回复像人话，短句，不编号。

## 知识库
Knapp关系阶段、社会渗透理论、Gottman情感竞标与四骑士、相互依赖理论、《亲密关系》。
输出语言跟用户输入一致。`;

module.exports = async function handler(req, res) {
  // GET 请求返回页面
  if (req.method === "GET") {
    return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(HTML);
  }

  // POST 请求做分析
  const { c } = req.body;
  if (!c || c.trim().length < 10) {
    return res.status(400).json({ error: "对话太短" });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: "未配置 API Key" });
  }

  try {
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.DEEPSEEK_API_KEY },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: "分析这段相亲对话：\n\n" + c + "\n\n逐句拆解→整体判断→回复建议→止损判断。每条带出处标签。" },
        ],
      }),
    });
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "分析失败，请重试";
    res.status(200).json({ result: text });
  } catch (err) {
    res.status(500).json({ error: "服务异常，请稍后重试" });
  }
}
