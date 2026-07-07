-- ============================================================================
-- 0027_seed_foods_staples.sql
-- ----------------------------------------------------------------------------
-- Complementa o seed 0008 com os STAPLES da dieta brasileira que faltavam:
-- feijão e leguminosas, ovos, leite e derivados, e aves (frango).
-- Valores por 100 g, fonte: TACO 4ª ed. (NEPA/UNICAMP), transcritos.
-- Colunas: (name, kcal_per_100, protein_per_100, is_seed=true) — read-only.
--
-- Idempotente: só insere se ainda não existir um seed com o mesmo nome.
-- ============================================================================

insert into public.foods (name, kcal_per_100, protein_per_100, is_seed)
select v.name, v.kcal, v.prot, true
from (values
  -- Feijão e leguminosas -----------------------------------------------------
  ('Feijão, carioca, cozido',            76,  4.8),
  ('Feijão, preto, cozido',              77,  4.5),
  ('Feijão, fradinho, cozido',           78,  5.0),
  ('Feijão, jalo, cozido',               91,  6.0),
  ('Lentilha, cozida',                   93,  6.3),
  ('Grão-de-bico, cru',                 355, 21.2),
  ('Ervilha, em vagem, crua',            88,  7.5),
  ('Soja, extrato solúvel, pó',         459, 35.7),
  -- Ovos ---------------------------------------------------------------------
  ('Ovo, de galinha, inteiro, cozido',  146, 13.3),
  ('Ovo, de galinha, inteiro, frito',   240, 15.6),
  ('Ovo, de galinha, gema, crua',       353, 15.9),
  ('Ovo, de galinha, clara, crua',       49, 10.9),
  -- Leite e derivados --------------------------------------------------------
  ('Leite, de vaca, integral',           61,  3.2),
  ('Leite, de vaca, desnatado',          35,  3.4),
  ('Leite, em pó, integral',            497, 25.4),
  ('Iogurte, natural',                   51,  4.1),
  ('Iogurte, natural, desnatado',        41,  3.8),
  ('Queijo, minas, frescal',            264, 17.4),
  ('Queijo, muçarela',                  330, 22.6),
  ('Queijo, prato',                     360, 25.8),
  ('Queijo, parmesão',                  453, 35.6),
  ('Requeijão, cremoso',                257,  9.6),
  ('Ricota',                            140, 12.6),
  -- Aves (frango) ------------------------------------------------------------
  ('Frango, peito, sem pele, cru',      119, 21.5),
  ('Frango, peito, sem pele, grelhado', 159, 32.0),
  ('Frango, peito, sem pele, cozido',   163, 31.5),
  ('Frango, coxa, com pele, assada',    215, 27.5),
  ('Frango, sobrecoxa, sem pele, cozida', 167, 26.9),
  ('Frango, inteiro, com pele, assado', 226, 26.9)
) as v(name, kcal, prot)
where not exists (
  select 1 from public.foods f
  where f.is_seed = true and f.name = v.name
);
