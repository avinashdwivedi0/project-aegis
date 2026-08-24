# Model Routing

## Route by task
- Classification/extraction → smallest capable model.
- Summarization → efficient model.
- Complex repair reasoning → stronger model when justified.
- Sensitive code → local model when practical.

## Routing Rule
Model selection must be evaluated empirically. Do not assume a model is superior based on reputation alone.

## Fallback
If a model fails schema validation or times out, use bounded retry/fallback behavior.
