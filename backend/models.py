from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Company(db.Model):
    __tablename__ = 'companies'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    base_currency = db.Column(db.String(3), default='USD')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    users = db.relationship('User', backref='company', lazy=True)
    expenses = db.relationship('Expense', backref='company', lazy=True)
    policies = db.relationship('Policy', backref='company', lazy=True)
    
    def to_dict(self): 
        return {
            'id': self.id, 
            'name': self.name, 
            'base_currency': self.base_currency
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'Admin', 'Manager', 'Employee'
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    manager = db.relationship('User', remote_side=[id], backref='direct_reports')
    submitted_expenses = db.relationship('Expense', backref='submitter', lazy=True, foreign_keys='Expense.user_id')
    approval_steps = db.relationship('ApprovalStep', backref='approver', lazy=True, foreign_keys='ApprovalStep.approver_id')
    
    def to_dict(self): 
        return {
            'id': self.id, 
            'email': self.email, 
            'name': self.name, 
            'role': self.role, 
            'company_id': self.company_id,
            'manager_id': self.manager_id, 
            'manager_name': self.manager.name if self.manager else 'N/A'
        }

class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    category = db.Column(db.String(50), default='Other')
    date = db.Column(db.Date, default=datetime.utcnow().date)
    status = db.Column(db.String(20), default='Pending')  # 'Pending', 'Approved', 'Rejected'
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    approval_steps = db.relationship('ApprovalStep', backref='expense', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_steps=False):
        res = {
            'id': self.id, 
            'user_id': self.user_id, 
            'submitter_name': self.submitter.name if self.submitter else 'Unknown',
            'title': self.title, 
            'description': self.description, 
            'amount': self.amount, 
            'currency': self.currency, 
            'category': self.category, 
            'date': self.date.isoformat() if self.date else datetime.utcnow().date().isoformat(), 
            'status': self.status, 
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }
        
        if include_steps:
            res['approval_steps'] = sorted(
                [s.to_dict() for s in self.approval_steps], 
                key=lambda s: s['sequence']
            )
        return res

class ApprovalStep(db.Model):
    __tablename__ = 'approval_steps'
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    approver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sequence = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Waiting')  # 'Waiting', 'Approved', 'Rejected', 'Skipped'
    comments = db.Column(db.Text)
    decided_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self): 
        return {
            'id': self.id, 
            'expense_id': self.expense_id, 
            'approver_id': self.approver_id, 
            'approver_name': self.approver.name if self.approver else 'Unknown',
            'sequence': self.sequence, 
            'status': self.status, 
            'comments': self.comments,
            'decided_at': self.decided_at.isoformat() if self.decided_at else None
        }

class Policy(db.Model):
    __tablename__ = 'policies'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    max_amount = db.Column(db.Float, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self): 
        return {
            'id': self.id, 
            'category': self.category, 
            'max_amount': self.max_amount
        }