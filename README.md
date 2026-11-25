# STACK BURGER — cardápio 3D + AR

## Rodar
1. `npm install`
2. Crie um projeto no Supabase. No SQL Editor rode `supabase/migrations/0001_init.sql` e depois `supabase/seed.sql`.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Em Authentication > Users crie o usuário do dono e vincule ao restaurante:
   `insert into restaurant_members (restaurant_id,user_id) select id,'<UUID_DO_USUARIO>' from restaurants where slug='stack-burger';`
5. `npm run dev` → cardápio em `/restaurante/stack-burger`, painel em `/admin`.
6. Deploy: Vercel (adicione as duas variáveis; crie `vercel.json` com rewrite de `/(.*)` para `/index.html`).

## Estado real
- Implementado: cardápio público, categorias, produto, adicionais, carrinho, WhatsApp, viewer 3D com calibração, AR (Quick Look/Scene Viewer), painel (dashboard, categorias, produtos com upload de fotos e modelos, dimensões, configurações, QR Code), RLS, analytics.
- Dados demo: 24 produtos, SEM fotos e SEM modelos 3D. Envie GLBs e fotos pelo painel. Produtos sem modelo mostram "Modelo 3D ainda não disponível".
- NÃO testado: o código não foi compilado nem executado (ambiente sem rede). Espere pequenos ajustes de tipos no primeiro `npm run build`.
- Limite de AR: iPhone exige USDZ em escala real; Android depende do Scene Viewer, que pode ignorar o `scale`. Valide em aparelhos reais; o ideal é gravar a escala no GLB (etapa futura).
- Pendente: ordenação de produtos, galeria com exclusão de fotos no painel, upload de logotipo (hoje por URL), identidade visual refinada com fotografia real.

## Novo cliente (venda direta)
1. Supabase > Authentication > Users > Add user (e-mail e senha do dono, e-mail confirmado).
2. SQL Editor: `select create_restaurant('slug-do-cliente', 'Nome do Cliente', 'email-do-dono@exemplo.com');`
3. Para publicar: `update restaurants set is_published = true where slug = 'slug-do-cliente';`
4. O dono entra em `/admin`; o cardápio fica em `/restaurante/slug-do-cliente`.

## Teste de isolamento
Após qualquer mudança em políticas (RLS), rode `supabase/tests/isolation.sql` no SQL Editor. Deve imprimir "OK: isolamento entre restaurantes verificado".

## Modelos 3D (etapa 3)
- Aceitamos só **GLB** (autocontido). O painel valida o arquivo, calibra pela dimensão cadastrada e **grava a escala real dentro do GLB** ao salvar, para valer no Android (Scene Viewer) e no iPhone.
- iPhone: se não houver USDZ, o model-viewer tenta gerar um a partir do GLB; se houver USDZ, ele deve estar em escala real. **Valide em iPhone e Android reais** antes de entregar a um cliente.
- Otimização (faça antes do upload, no computador): `npx @gltf-transform/cli optimize entrada.glb saida.glb --compress meshopt --texture-compress webp`. Meta: abaixo de 5 MB por modelo.
