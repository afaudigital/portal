# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

## [1.0.2] — 2026-07-24

### Corrigido
- **Leitura de QR por imagem continuava falhando no iPhone** mesmo com o redimensionamento adicionado na v1.0.1 (testado com uma imagem real do usuário: o QR era válido e nítido, então o problema não era resolução). Diagnóstico: o caminho `scanFile` da `html5-qrcode` é pouco confiável no Safari mobile — provavelmente por ser um caminho secundário da lib, pensado principalmente para vídeo ao vivo. Corrigido trocando, só para o fluxo de leitura por imagem, para a **jsQR**, que decodifica direto de um canvas sem depender do pipeline de vídeo/DOM da outra lib.
- **Barra de status do iPhone sobrepondo os botões do topbar** quando o app era instalado na tela de início (relógio sobre a logo; sinal/wi-fi/bateria sobre a lupa e o botão de tema). Causa: `apple-mobile-web-app-status-bar-style` estava como `black-translucent`, que faz o conteúdo do app começar por baixo da barra de status. Corrigido para `black` (reserva o espaço automaticamente), reforçado com `padding` de `env(safe-area-inset-top)` no topbar.
- **Logo pequena** — substituído o texto "Informação · Controle · Auditoria · Fiscalização" (duplicado, já que a frase já existe na própria arte) por um banner grande e centralizado com a logo completa, no topo da tela inicial.

## [1.0.1] — 2026-07-24

### Corrigido
- Botão de lupa no topbar não tinha nenhuma ação ligada a ele. Agora abre uma tela de **Pesquisa** dedicada, com busca combinada em histórico + favoritos.
- Leitura de QR Code por imagem falhava no iPhone/Safari mesmo com fotos nítidas (funcionava normalmente no Mac). Causa: o Safari/iOS tem um limite de área de canvas mais restritivo que Chrome, e fotos de câmeras modernas (12–48 MP) estouravam esse limite silenciosamente. Corrigido redimensionando a imagem para escalas seguras antes de decodificar, com múltiplas tentativas.
- Logo do topbar e da tela "Sobre" aumentada e com fundo removido (transparência), ficando mais harmoniosa em ambos os temas.
- Ícone do app (usado ao "Adicionar à Tela de Início" no iPhone) refeito a partir do símbolo circular da marca, com preenchimento maior no quadrado navy.

## [1.0.0] — 2026-07-24

### Adicionado
- Estrutura inicial do PWA (HTML/CSS/JS puro, sem frameworks).
- Scanner de QR Code pela câmera traseira (leitura contínua, som, lanterna quando suportado).
- Leitura de QR Code por imagem da galeria.
- Decodificação local do link oficial da SEMOB-DF (CPF Base64 → CPF, placa).
- Validação de domínio (allowlist) antes de qualquer abertura automática de link — proteção contra QR Code adulterado.
- Consulta manual por CPF + placa, com geração do link no mesmo formato oficial.
- Histórico local (até 100 consultas), com origem (QR / Imagem / Manual) e busca.
- Favoritos (salvar, remover, buscar).
- Estatísticas com gráfico de consultas por dia (Chart.js).
- Tema claro / escuro / automático, com persistência da preferência.
- Exportação de backup (JSON) e histórico (CSV); importação de backup.
- Manifest PWA e Service Worker para instalação e uso offline (exceto a consulta ao site oficial).
- Fluxo de instalação diferenciado para iOS (manual, via Safari) e Android/Desktop (prompt nativo).

### Decisões de arquitetura
- Substituição de "consulta automática via fetch" por decodificação local + abertura manual em nova aba, por incompatibilidade com hospedagem estática (GitHub Pages, sem backend/CORS).
- Ver seção "Decisões de arquitetura" do `README.md` para detalhes.
