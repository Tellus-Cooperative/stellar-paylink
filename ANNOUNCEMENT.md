# HareLink v0.1.0 — payment links for the cooperative web

Publicado el 16 de septiembre de 2026.

## El problema

Los enlaces de pago que circulan hoy dependen de plataformas que custodian los fondos, cobran por el procesamiento o exigen una cuenta. Una cooperativa o un creador que quiere cobrar de forma directa no tiene una opción pequeña, libre y verificable.

## Lo que hicimos

HareLink es una utilidad de código abierto, MIT, no custodial, construida sobre la red Stellar:

- Crea una solicitud de pago con monto, activo y destino.
- Compártela por link, código QR o tarjeta de compartir (X, WhatsApp o el sistema).
- Quien paga firma una operación `Payment` desde su propia wallet; HareLink nunca toma custodia.
- El servidor verifica contra datos de red (destino, monto, activo, memo y unicidad de transacción) antes de marcar el pago como verificado.
- Genera un recibo con hash de transacción y enlace al explorador.

Sin claves privadas. Sin semillas. Sin custodia.

## Estado actual

- **Red:** Testnet de Stellar (Mainnet desactivado por diseño).
- **En vivo:** https://stellar-paylink-lac.vercel.app
- **Código:** https://github.com/Tellus-Cooperative/stellar-paylink
- **Demo en GIF:** `demo/harelink-demo.gif`
- **Capturas:** flujo create → success → menú de compartir.
- **Cobertura:** 77 pruebas unitarias/integración y 10 de navegador en verde; CI con gates de calidad y escaneo de secretos (0 hallazgos).
- **Pagos verificados en vivo:** XLM en Testnet y USDC canónico (Circle) con trustline.
- Software experimental, no auditado. Usa únicamente activos de Testnet durante el sprint `v0.1.0`.

## Cómo probarlo en 10 minutos

1. Clona o bifurca el repo.
2. `cp .env.example .env.local && pnpm install && pnpm dev`.
3. Abre `http://localhost:3000/create`, completa título, monto y destino (una dirección G... de Testnet) y crea el link.
4. Comparte el link o el QR.
5. Quien paga abre `/pay/[slug]`, conecta Freighter y aprueba la transacción.
6. El creador ve el estado pasar a `paid` con recibo verificado.

## Limitaciones conocidas

- Testnet únicamente; la configuración de Mainnet queda para futura revisión.
- Freighter es el único adaptador de wallet (multi-wallet está planificado en v0.2).
- Sin autenticación, panel, cobros recurrentes ni contratos inteligentes en esta versión.
- Software experimental y no auditado.

## Qué sigue

Los detalles de la planificación están en `roadmap.md` y en los issues iniciales del repositorio: soporte multi-wallet, interfaces en español y portugués, más activos configurados, mejor exportación de recibos, cancelación por parte del creador, restablecimiento de conexión al pagar, marca configurable por fork y más cobertura de accesibilidad y dispositivos.

## Agradecimientos

Construido con Next.js, el SDK de Stellar, Freighter, Tailwind CSS y Vercel, y alojado por Tellus Cooperative.