-- Corrige a procedência dos seeds TACO já existentes.
-- A migration anterior foi aplicada com source = 'woolves_seed'; os dados
-- vieram das cargas brasileiras 0008, 0027 e 0031, portanto devem aparecer
-- como TACO na busca e ter prioridade sobre registros externos.

update public.foods
   set source = 'taco',
       verified = true,
       source_confidence = greatest(source_confidence, 0.98)
 where is_seed = true
   and source = 'woolves_seed';
