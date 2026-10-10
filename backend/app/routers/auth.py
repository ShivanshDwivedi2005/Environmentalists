from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from datetime import datetime, timezone
from app.models import User, Municipality, MunicipalEmployeeInvite
from app.schemas import (
    UserCreate, UserLogin, UserOut, TokenResponse,
    MunicipalityAccountCreate, MunicipalEmployeeRegister,
)
from app.security import hash_password, verify_password, create_access_token, get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    requested_role = user_in.role.upper()
    if requested_role not in ["CITIZEN", "ORGANIZATION"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Municipal employees must use municipal employee registration; privileged roles cannot be self-assigned.",
        )

    email = str(user_in.email).lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    user = User(
        email=email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=requested_role,
        municipality_id=user_in.municipality_id,
        organization_id=user_in.organization_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService.log(
        db,
        action="USER_REGISTERED",
        entity_name="User",
        entity_id=user.id,
        actor_id=user.id,
        payload={"email": user.email, "role": user.role}
    )

    return user


@router.post("/register-municipality", response_model=UserOut)
def register_municipality_account(
    account_in: MunicipalityAccountCreate,
    db: Session = Depends(get_db),
):
    """Create the first municipal account using the municipality's official email."""
    municipality = db.query(Municipality).filter(Municipality.id == account_in.municipality_id).first()
    if not municipality or municipality.verification_status != "VERIFIED":
        raise HTTPException(status_code=404, detail="Verified municipality not found")

    email = str(account_in.email).lower()
    if email != municipality.official_email.lower():
        raise HTTPException(status_code=403, detail="Email must match the municipality's verified official email")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    if db.query(User).filter(User.municipality_id == municipality.id, User.role == "MUNICIPAL").first():
        raise HTTPException(status_code=409, detail="This municipality already has a primary account")

    user = User(
        email=email,
        hashed_password=hash_password(account_in.password),
        full_name=account_in.full_name,
        role="MUNICIPAL",
        municipality_id=municipality.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    AuditService.log(
        db,
        action="MUNICIPALITY_ACCOUNT_REGISTERED",
        entity_name="User",
        entity_id=user.id,
        actor_id=user.id,
        payload={"municipality_id": municipality.id},
    )
    return user


@router.post("/register-municipal-employee", response_model=UserOut)
def register_municipal_employee(
    employee_in: MunicipalEmployeeRegister,
    db: Session = Depends(get_db),
):
    """Register against an employee ID/email previously loaded by a municipality."""
    email = str(employee_in.email).lower()
    invite = db.query(MunicipalEmployeeInvite).filter(
        MunicipalEmployeeInvite.municipality_id == employee_in.municipality_id,
        MunicipalEmployeeInvite.employee_id == employee_in.employee_id,
        MunicipalEmployeeInvite.email == email,
        MunicipalEmployeeInvite.status == "INVITED",
    ).first()
    if not invite:
        raise HTTPException(status_code=403, detail="No active municipal employee invitation matches these details")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user = User(
        email=email,
        hashed_password=hash_password(employee_in.password),
        full_name=employee_in.full_name,
        role="MUNICIPAL",
        municipality_id=invite.municipality_id,
    )
    db.add(user)
    db.flush()
    invite.status = "REGISTERED"
    invite.claimed_by_user_id = user.id
    invite.claimed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    AuditService.log(
        db,
        action="MUNICIPAL_EMPLOYEE_REGISTERED",
        entity_name="User",
        entity_id=user.id,
        actor_id=user.id,
        payload={"municipality_id": invite.municipality_id, "employee_id": invite.employee_id},
    )
    return user

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(credentials.email).lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    access_token = create_access_token(data={"sub": user.id, "role": user.role})

    AuditService.log(
        db,
        action="USER_LOGIN",
        entity_name="User",
        entity_id=user.id,
        actor_id=user.id,
        payload={"email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

