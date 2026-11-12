-- DEMO ONLY. Run after migrations/0001_booking_system.sql.
-- Fixed primary keys + INSERT OR IGNORE make repeated runs idempotent.
INSERT OR IGNORE INTO orders
(id, tracking_token, idempotency_key, customer_name, customer_email, customer_phone, package_id, package_name, amount_cents, currency, status, customer_note, admin_note, is_demo, created_at, updated_at)
VALUES
('DEMO-KN-0001','demo-token-0001','demo-key-0001','Aiman Hakim','aiman.demo@example.test','+60123456001','landing-page','Landing Page Package',29900,'MYR','Pending','Demo request for a small business landing page.','',1,'2026-11-08T09:00:00.000Z','2026-11-08T09:00:00.000Z'),
('DEMO-KN-0002','demo-token-0002','demo-key-0002','Nur Aisyah','aisyah.demo@example.test','+60123456002','premium-standard','Premium Standard',90000,'MYR','Confirmed','Demo corporate website project.','Brief received; waiting for assets.',1,'2026-11-09T10:30:00.000Z','2026-11-10T02:00:00.000Z'),
('DEMO-KN-0003','demo-token-0003','demo-key-0003','Daniel Tan','daniel.demo@example.test','+60123456003','landing-page','Landing Page Package',29900,'MYR','In Progress','Demo campaign landing page.','Initial layout in progress.',1,'2026-11-07T04:15:00.000Z','2026-11-11T03:20:00.000Z'),
('DEMO-KN-0004','demo-token-0004','demo-key-0004','Siti Mariam','siti.demo@example.test','+60123456004','premium-standard','Premium Standard',90000,'MYR','Completed','Demo portfolio and service website.','Demo delivery completed.',1,'2026-11-03T01:00:00.000Z','2026-11-06T08:00:00.000Z'),
('DEMO-KN-0005','demo-token-0005','demo-key-0005','Farid Iskandar','farid.demo@example.test','+60123456005','landing-page','Landing Page Package',29900,'MYR','Cancelled','Demo test booking.','Cancelled by demo customer.',1,'2026-11-05T06:45:00.000Z','2026-11-05T09:00:00.000Z');

INSERT OR IGNORE INTO order_status_history (id, order_id, old_status, new_status, admin_email, note, changed_at) VALUES
('DEMO-H-0001','DEMO-KN-0001',NULL,'Pending','system','Demo order created','2026-11-08T09:00:00.000Z'),
('DEMO-H-0002','DEMO-KN-0002',NULL,'Pending','system','Demo order created','2026-11-09T10:30:00.000Z'),
('DEMO-H-0003','DEMO-KN-0002','Pending','Confirmed','demo-admin@example.test','Brief received','2026-11-10T02:00:00.000Z'),
('DEMO-H-0004','DEMO-KN-0003',NULL,'Pending','system','Demo order created','2026-11-07T04:15:00.000Z'),
('DEMO-H-0005','DEMO-KN-0003','Pending','Confirmed','demo-admin@example.test','Work scheduled','2026-11-08T02:00:00.000Z'),
('DEMO-H-0006','DEMO-KN-0003','Confirmed','In Progress','demo-admin@example.test','Development started','2026-11-11T03:20:00.000Z'),
('DEMO-H-0007','DEMO-KN-0004',NULL,'Pending','system','Demo order created','2026-11-03T01:00:00.000Z'),
('DEMO-H-0008','DEMO-KN-0004','Pending','Confirmed','demo-admin@example.test','Project accepted','2026-11-03T03:00:00.000Z'),
('DEMO-H-0009','DEMO-KN-0004','Confirmed','In Progress','demo-admin@example.test','Work started','2026-11-04T02:00:00.000Z'),
('DEMO-H-0010','DEMO-KN-0004','In Progress','Completed','demo-admin@example.test','Demo project delivered','2026-11-06T08:00:00.000Z'),
('DEMO-H-0011','DEMO-KN-0005',NULL,'Pending','system','Demo order created','2026-11-05T06:45:00.000Z'),
('DEMO-H-0012','DEMO-KN-0005','Pending','Cancelled','demo-admin@example.test','Demo cancellation','2026-11-05T09:00:00.000Z');

INSERT OR IGNORE INTO maintenance_logs
(id, title, activity_type, description, status, performed_by, performed_at, is_demo, created_at)
VALUES
('DEMO-M-0001','Weekly database backup','Backup','Verified demo backup record; no real production data was touched.','Completed','demo-admin@example.test','2026-11-09T02:00:00.000Z',1,'2026-11-09T02:00:00.000Z'),
('DEMO-M-0002','Review admin access policy','Security','Demo review of Cloudflare Access allowlist and protected routes.','In Progress','demo-admin@example.test','2026-11-11T04:00:00.000Z',1,'2026-11-11T04:00:00.000Z'),
('DEMO-M-0003','Update booking form validation','Update','Demo maintenance task for input validation and error messaging.','Planned','demo-admin@example.test','2026-11-14T03:00:00.000Z',1,'2026-11-12T03:00:00.000Z');
