# Bibliotecas externas necessárias

Este ambiente de geração de código não tem acesso à internet, então as
bibliotecas abaixo **não foram baixadas automaticamente**. Baixe cada
uma e salve nesta pasta (`/libs`) com o nome exato indicado, antes de
publicar no GitHub Pages — isso garante funcionamento 100% offline
depois do primeiro carregamento (o Service Worker cacheia esses arquivos
locais, e não uma CDN de terceiros).

| Arquivo | Onde baixar | Uso |
|---|---|---|
| `html5-qrcode.min.js` | https://github.com/mebjas/html5-qrcode/releases (arquivo `html5-qrcode.min.js` do release mais recente) | Scanner por câmera e leitura de QR por imagem |
| `chart.min.js` | https://www.jsdelivr.com/package/npm/chart.js → arquivo `dist/chart.umd.js` (renomeie para `chart.min.js`) | Gráfico de consultas por dia na tela de Estatísticas |

## Alternativa rápida (enquanto testa)

Se quiser testar antes de baixar os arquivos, pode trocar temporariamente
em `index.html`:

```html
<script src="libs/html5-qrcode.min.js"></script>
<script src="libs/chart.min.js"></script>
```

por:

```html
<script src="https://unpkg.com/html5-qrcode"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

Mas para a versão final publicada, prefira os arquivos locais nesta
pasta — assim o app funciona mesmo sem internet (exceto, claro, o botão
"Consultar no site oficial", que sempre precisa de rede).
