-- Run with the Supabase SQL editor or execute_sql. All fixtures are rolled back.
begin;
do $test$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  resource uuid := gen_random_uuid();
  total integer;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (a,'rls-a-'||a||'@example.invalid','{"full_name":"Prueba A"}'),
    (b,'rls-b-'||b||'@example.invalid','{"full_name":"Prueba B"}');
  insert into public.member_resources(id,title,is_published) values(resource,'Recurso de prueba transaccional',true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;

  select count(*) into total from public.profiles where user_id in (a,b);
  if total <> 1 then raise exception 'FAIL: cross-user profile visibility'; end if;
  update public.profiles set full_name='Perfil actualizado' where user_id=a;
  get diagnostics total = row_count;
  if total <> 1 then raise exception 'FAIL: own profile update'; end if;
  update public.profiles set full_name='No permitido' where user_id=b;
  get diagnostics total = row_count;
  if total <> 0 then raise exception 'FAIL: cross-user update'; end if;
  begin
    update public.profiles set membership_status='active' where user_id=a;
    raise exception 'FAIL: self approval allowed';
  exception when insufficient_privilege then null;
  end;

  insert into public.membership_applications(user_id,motivation,privacy_accepted_at)
    values(a,'Solicitud transaccional',now());
  select count(*) into total from public.membership_applications where user_id=a and status='pending';
  if total <> 1 then raise exception 'FAIL: application insert/default status'; end if;
  begin
    insert into public.membership_applications(user_id,privacy_accepted_at) values(a,now());
    raise exception 'FAIL: duplicate application allowed';
  exception when unique_violation then null;
  end;
  begin
    insert into public.membership_applications(user_id,privacy_accepted_at) values(b,now());
    raise exception 'FAIL: application for another account allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform admin_notes from public.membership_applications where user_id=a;
    raise exception 'FAIL: administrative notes visible';
  exception when insufficient_privilege then null;
  end;
  select count(*) into total from public.member_resources where id=resource;
  if total <> 0 then raise exception 'FAIL: nonmember resources visible'; end if;
  begin
    insert into public.workshop_registrations(user_id,workshop_id) values(a,gen_random_uuid());
    raise exception 'FAIL: workshop registration open';
  exception when insufficient_privilege then null;
  end;

  reset role;
  update public.profiles set membership_status='active' where user_id=a;
  set local role authenticated;
  select count(*) into total from public.member_resources where id=resource;
  if total <> 1 then raise exception 'FAIL: active member resource inaccessible'; end if;
  reset role;
end;
$test$;
rollback;
select 'PASS: profile isolation/editing, protected status, application/default/duplicates/isolation, private notes, resource authorization, workshops closed; fixtures rolled back' as result;
