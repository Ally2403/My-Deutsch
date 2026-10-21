-- RF-51: versión del pipeline con la que se procesó cada libro. Migración aditiva: los libros
-- existentes quedan en 1 y el modo «upgrade» del worker los sube a la versión vigente.
alter table public.books
  add column pipeline_version int not null default 1 check (pipeline_version >= 1);
