.PHONY: backend test mobile
backend:
	cd backend && python -m uvicorn app.main:app --reload
test:
	cd backend && python -m pytest
mobile:
	cd mobile && npm start
caspian:
	cd backend && python run_caspian.py
connect-slack:
	cd backend && python connect_caspian.py
