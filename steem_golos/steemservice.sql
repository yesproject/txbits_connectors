--
-- Name: add_fiat_money(bigint, character varying, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION add_fiat_money(a_uid bigint, a_currency character varying, a_amount numeric, a_memo character varying) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO public, pg_temp
    AS $$
declare
deposit_id bigint;
begin
insert into deposits(amount, user_id, currency, fee) values (a_amount, a_uid, a_currency, 0) returning id into deposit_id;
insert into deposits_other(id, reason) values (deposit_id, a_memo);
perform transfer_funds(null, a_uid, a_currency, a_amount);
end;
$$;


--
-- Name: remove_fiat_money(bigint, character varying, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION remove_fiat_money(a_uid bigint, a_currency character varying, a_amount numeric, a_memo character varying) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO public, pg_temp
    AS $$
declare
withdrawal_id bigint;
begin
insert into withdrawals(amount, user_id, currency, fee) values (a_amount, a_uid, a_currency, 0) returning id into withdrawal_id;
insert into withdrawals_other(id, reason) values (withdrawal_id, memo);
perform transfer_funds(a_uid, null, a_currency, a_amount);
end;
$$;