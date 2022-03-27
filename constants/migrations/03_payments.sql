create table payments
(
    id                      bigserial
        primary key,
    payment_sys_id          varchar(255) default '0'::character varying,
    payment_service_id      integer                                not null
        references payment_services
            on delete cascade,
    created_at              timestamp    default CURRENT_TIMESTAMP not null,
    amount                  integer                                not null,
    click_error             varchar(255),
    click_error_note        text,
    click_paydoc_id         text,
    payment_sys_create_time timestamp    default CURRENT_TIMESTAMP not null,
    payment_status_id       integer                                not null
        references payment_statuses
            on delete cascade,
    performed_at            timestamp
);