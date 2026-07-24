# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

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
