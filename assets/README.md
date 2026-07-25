# AFAU Digital — Consulta QR Code

PWA para apoio à fiscalização do transporte público e por aplicativo no Distrito Federal, com leitura e decodificação local do QR Code oficial da SEMOB-DF.

> **Informação · Controle · Auditoria · Fiscalização**

---

## Índice

- [Visão geral](#visão-geral)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Dependências](#dependências)
- [Instalação local (desenvolvimento)](#instalação-local-desenvolvimento)
- [Publicação no GitHub Pages](#publicação-no-github-pages)
- [Atualização do app já publicado](#atualização-do-app-já-publicado)
- [Uso no iPhone](#uso-no-iphone)
- [Uso no Android](#uso-no-android)
- [Uso no Desktop](#uso-no-desktop)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Decisões de arquitetura](#decisões-de-arquitetura)
- [Licença](#licença)

---

## Visão geral

O app lê o QR Code impresso no veículo (câmera ou imagem da galeria), decodifica **localmente** a placa e o CPF que já vêm codificados no próprio link, e exibe o resultado. A consulta ao site oficial da SEMOB só acontece quando o usuário toca em **"Consultar no site oficial"**, que abre o link em nova aba.

Tudo o resto — histórico, favoritos, estatísticas, tema — funciona 100% offline, salvo apenas no dispositivo (LocalStorage), sem envio de dados a terceiros.

---

## Estrutura do projeto

```
AFAU-Digital/
├── index.html            # Marcação de todas as telas (SPA de uma página)
├── style.css              # Tokens de design + estilos
├── app.js                 # Navegação, telas, eventos, orquestração geral
├── utils.js                # Parser do link SEMOB + validação de domínio (allowlist)
├── storage.js              # Persistência local (histórico, favoritos, configurações)
├── scanner.js               # Leitura de QR pela câmera (html5-qrcode)
├── camera.js                # Leitura de QR a partir de imagem da galeria
├── manifest.json           # Manifesto PWA
├── service-worker.js       # Cache do app shell / suporte offline
├── LICENSE
├── CHANGELOG.md
├── assets/
│   ├── icons/               # Ícones do app (192, 512, apple-touch-icon, favicon)
│   └── img/                 # Logo
└── libs/
    ├── LEIA-ME.md           # Onde baixar as libs externas
    ├── html5-qrcode.min.js  # (baixar manualmente — ver libs/LEIA-ME.md)
    └── chart.min.js         # (baixar manualmente — ver libs/LEIA-ME.md)
```

---

## Dependências

Todas gratuitas e sem necessidade de conta/chave de API:

| Biblioteca | Função | Observação |
|---|---|---|
| [html5-qrcode](https://github.com/mebjas/html5-qrcode) | Scanner **pela câmera** (leitura contínua ao vivo) | Baixe `html5-qrcode.min.js` e coloque em `/libs` |
| [jsQR](https://github.com/cozmo/jsQR) | Leitura de QR **por imagem da galeria** | Baixe e salve como `/libs/jsqr.min.js`. Usada em vez da `html5-qrcode` para este fluxo porque o caminho de leitura de arquivo dela se mostrou pouco confiável no Safari/iPhone |
| [Chart.js](https://www.chartjs.org/) | Gráfico de consultas por dia | Baixe `chart.js` (versão UMD) e coloque em `/libs/chart.min.js` |

Sem esses arquivos em `/libs`, o app abre e funciona normalmente (navegação, consulta manual, histórico, favoritos, tema), exceto: scanner por câmera (falta html5-qrcode), leitura por imagem (falta jsQR) e o gráfico de estatísticas (falta Chart.js).

Instruções detalhadas de onde baixar cada arquivo: [`libs/LEIA-ME.md`](./libs/LEIA-ME.md).

---

## Instalação local (desenvolvimento)

Como é um app 100% estático, basta servir a pasta com qualquer servidor HTTP local — **não abra `index.html` direto com `file://`**, porque o Service Worker e a câmera exigem `http(s)://`.

```bash
# Opção 1 — Python (já vem instalado na maioria dos sistemas)
cd AFAU-Digital
python3 -m http.server 8080
# abra http://localhost:8080

# Opção 2 — Node (se tiver o pacote "serve" instalado globalmente)
npx serve .
```

A câmera só é solicitada quando você entra na aba **Scanner** — o navegador vai pedir permissão na primeira vez.

---

## Publicação no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `afau-digital`).
2. Suba todos os arquivos da pasta `AFAU-Digital/` para a raiz do repositório (mantendo a estrutura de pastas).
3. No repositório, vá em **Settings → Pages**.
4. Em **Source**, selecione a branch `main` (ou `master`) e a pasta `/root`.
5. Salve. Em alguns minutos o GitHub publica em:
   ```
   https://<seu-usuario>.github.io/afau-digital/
   ```
6. Abra essa URL no celular e teste a instalação (ver seções abaixo).

> **Importante:** como o `start_url` e `scope` do `manifest.json` usam caminhos relativos (`./`), o app funciona tanto na raiz de um domínio próprio quanto em um subcaminho como `/afau-digital/` do GitHub Pages, sem precisar editar nada.

---

## Atualização do app já publicado

O Service Worker usa um nome de cache versionado (`CACHE_VERSION` em `service-worker.js`). Para forçar todos os usuários a receberem uma atualização:

1. Faça suas alterações nos arquivos.
2. Abra `service-worker.js` e incremente a versão, por exemplo:
   ```js
   const CACHE_VERSION = 'afau-digital-v2';
   ```
3. Suba (commit/push) para o GitHub. O Pages republica automaticamente.
4. Na próxima vez que o usuário abrir o app (mesmo offline depois voltando à rede), o navegador detecta o novo Service Worker, baixa os arquivos novos em segundo plano e os ativa na visita seguinte.

Sem incrementar essa versão, alterações de CSS/JS podem continuar servindo a versão em cache antiga por um tempo.

---

## Uso no iPhone

- Abra a URL do GitHub Pages no **Safari** (a instalação de PWA só funciona pelo Safari, não por outros navegadores no iOS).
- Toque no ícone de **Compartilhar** (quadrado com seta para cima) → **"Adicionar à Tela de Início"**.
- O app abre em modo standalone (sem barra de endereço), com o ícone gerado a partir da logo.
- **Limitações conhecidas do iOS/Safari** (não são bugs do app, são restrições da plataforma):
  - Vibração ao ler o QR não é suportada — o app usa som e destaque visual no lugar.
  - Lanterna (torch) pela câmera não é suportada.
  - Sem o app instalado na tela de início, o Safari pode apagar o histórico/favoritos salvos localmente após dias sem uso (ITP). Recomenda-se instalar e fazer backups periódicos pela tela de Configurações.

## Uso no Android

- Abra a URL no **Chrome** (ou outro navegador baseado em Chromium).
- Um banner/botão de instalação aparece automaticamente (ou em **Configurações → Instalar**).
- Após instalado, o app aparece na gaveta de aplicativos com ícone e splash screen próprios.
- Vibração, lanterna e leitura contínua de QR funcionam de forma nativa.

## Uso no Desktop

- Chrome, Edge: ícone de instalação na barra de endereço (⊕ ou "Instalar app").
- Firefox: não instala como PWA nativo, mas o app funciona normalmente como página comum, incluindo cache offline.
- A leitura de QR pela câmera funciona se o computador tiver webcam e a permissão for concedida.

---

## Segurança e privacidade

- **Nenhum dado é enviado a servidores próprios ou de terceiros.** Histórico, favoritos e configurações ficam apenas no LocalStorage do dispositivo.
- **CPF em Base64:** é apenas o formato de codificação usado no link oficial da SEMOB — não é uma medida de segurança nem criptografia (Base64 é reversível por qualquer pessoa).
- **Validação de domínio (allowlist):** antes de habilitar qualquer ação sobre um link lido, o app confere se o host é exatamente `servicos.semob.df.gov.br` e se o protocolo é HTTPS. Links fora disso são sinalizados com alerta vermelho e a abertura automática é bloqueada — proteção contra QR Codes adulterados/falsificados colados sobre o original.
- **Consulta ao site oficial nunca é automática:** é sempre um toque explícito do usuário em "Consultar no site oficial", aberto em nova aba.

---

## Decisões de arquitetura

Duas decisões que fogem do que normalmente se pediria em uma spec inicial, e por quê:

1. **Sem `fetch()` para a SEMOB:** GitHub Pages é hospedagem estática, sem backend. Fazer uma requisição direta ao domínio da SEMOB a partir do navegador exigiria que o servidor da SEMOB autorizasse explicitamente a origem do GitHub Pages via CORS — fora do nosso controle. A alternativa (um proxy próprio) contradiria a regra de "nenhum dado enviado a terceiros". Por isso, o app decodifica localmente o que já vem no link, e delega a consulta de fato ao navegador do usuário, em nova aba.
2. **Allowlist antes de qualquer ação automática:** a spec original previa abrir o link "sem intervenção do usuário" assim que o QR fosse lido. Isso foi revisto para nunca abrir nada sozinho — o app decodifica e exibe, mas quem decide consultar é sempre o fiscal, com o domínio já validado e visível na tela.

---

## Licença

Ver [`LICENSE`](./LICENSE).
