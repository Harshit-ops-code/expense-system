from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import json
from decimal import Decimal  # Make sure this is imported

app = Flask(__name__)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))

# Use environment variable for DB if available (Production), else fallback to SQLite (Local)
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///' + os.path.join(basedir, 'expense_manager.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'expense-manager-secret-key-2024'

db = SQLAlchemy(app)
CORS(app, resources={r"/*": {"origins": "*"}})

# [Your existing models and routes continue here...]

# Enhanced Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    department = db.Column(db.String(50), default='General')
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    manager = db.relationship('User', remote_side=[id], backref='direct_reports')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'department': self.department,
            'manager_id': self.manager_id,
            'manager_name': self.manager.name if self.manager else None,
            'is_active': self.is_active
        }

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    category = db.Column(db.String(50), default='Other')
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Pending')
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    receipt_url = db.Column(db.String(500))
    tags = db.Column(db.String(500))  # JSON string for multiple tags
    
    user = db.relationship('User', backref='expenses')
    approval_steps = db.relationship('ApprovalStep', backref='expense', lazy=True, cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='expense', lazy=True)

    def to_dict(self, include_steps=False, include_comments=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'submitter_name': self.user.name,
            'submitter_department': self.user.department,
            'title': self.title,
            'description': self.description,
            'amount': float(self.amount),
            'currency': self.currency,
            'category': self.category,
            'date': self.date.isoformat(),
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat(),
            'receipt_url': self.receipt_url,
            'tags': json.loads(self.tags) if self.tags else []
        }
        
        if include_steps:
            result['approval_steps'] = [step.to_dict() for step in sorted(self.approval_steps, key=lambda x: x.sequence)]
        
        if include_comments:
            result['comments'] = [comment.to_dict() for comment in self.comments]
        
        return result

class ApprovalStep(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    approver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sequence = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Waiting')
    comments = db.Column(db.Text)
    decided_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)  # Approval deadline
    
    approver = db.relationship('User', backref='approval_steps')

    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'approver_id': self.approver_id,
            'approver_name': self.approver.name,
            'sequence': self.sequence,
            'status': self.status,
            'comments': self.comments,
            'decided_at': self.decided_at.isoformat() if self.decided_at else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'is_overdue': self.due_date and datetime.utcnow() > self.due_date
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='comments')

    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'user_role': self.user.role,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }

class Policy(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    max_amount = db.Column(db.Numeric(10, 2), nullable=False)
    requires_receipt = db.Column(db.Boolean, default=True)
    approval_threshold = db.Column(db.Numeric(10, 2), default=0)  # Amount that triggers additional approvals
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'max_amount': float(self.max_amount),
            'requires_receipt': self.requires_receipt,
            'approval_threshold': float(self.approval_threshold)
        }

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info')  # info, warning, success, error
    is_read = db.Column(db.Boolean, default=False)
    related_expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'related_expense_id': self.related_expense_id,
            'created_at': self.created_at.isoformat()
        }

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        
        # Check if data exists to prevent overwriting/duplication
        if User.query.first():
            return

        # Create admin
        admin = User(
            email='admin@company.com',
            password='admin123',
            name='System Administrator',
            role='Admin',
            department='IT'
        )
        db.session.add(admin)
        db.session.flush()

        # Create managers
        manager1 = User(
            email='manager@company.com',
            password='manager123',
            name='John Manager',
            role='Manager',
            department='Sales',
            manager_id=admin.id
        )
        
        manager2 = User(
            email='manager2@company.com',
            password='manager456',
            name='Sarah Wilson',
            role='Manager',
            department='Marketing',
            manager_id=admin.id
        )
        db.session.add_all([manager1, manager2])
        db.session.flush()

        # Create employees
        employee1 = User(
            email='employee@company.com',
            password='emp123',
            name='Mike Johnson',
            role='Employee',
            department='Sales',
            manager_id=manager1.id
        )
        
        employee2 = User(
            email='employee2@company.com',
            password='emp456',
            name='Lisa Chen',
            role='Employee',
            department='Marketing',
            manager_id=manager2.id
        )

        employee3 = User(
            email='employee3@company.com',
            password='emp789',
            name='David Kim',
            role='Employee',
            department='Engineering',
            manager_id=manager1.id
        )
        db.session.add_all([employee1, employee2, employee3])
        db.session.flush()

        # Create sample expenses
        today = datetime.utcnow().date()
        
        # Approved expense
        exp1 = Expense(
            user_id=employee1.id,
            title='Client Dinner Meeting',
            description='Business dinner with potential client from TechCorp',
            amount=Decimal('120.00'),
            currency='USD',
            category='Meals',
            date=today - timedelta(days=5),
            status='Approved',
            tags=json.dumps(['client', 'business', 'dinner'])
        )
        db.session.add(exp1)
        db.session.flush()
        
        # Create approval steps
        step1 = ApprovalStep(
            expense_id=exp1.id,
            approver_id=manager1.id,
            sequence=1,
            status='Approved',
            comments='Client entertainment - approved',
            decided_at=datetime.utcnow() - timedelta(days=4)
        )
        step2 = ApprovalStep(
            expense_id=exp1.id,
            approver_id=admin.id,
            sequence=2,
            status='Approved',
            comments='Within policy limits',
            decided_at=datetime.utcnow() - timedelta(days=3)
        )
        db.session.add_all([step1, step2])

        # Pending expense
        exp2 = Expense(
            user_id=employee2.id,
            title='Marketing Conference Tickets',
            description='Digital Marketing Summit 2024 registration',
            amount=Decimal('450.00'),
            currency='USD',
            category='Travel',
            date=today - timedelta(days=2),
            status='Pending',
            tags=json.dumps(['conference', 'professional-development'])
        )
        db.session.add(exp2)
        db.session.flush()
        
        step3 = ApprovalStep(
            expense_id=exp2.id,
            approver_id=manager2.id,
            sequence=1,
            status='Approved',
            comments='Relevant for role',
            decided_at=datetime.utcnow() - timedelta(days=1)
        )
        step4 = ApprovalStep(
            expense_id=exp2.id,
            approver_id=admin.id,
            sequence=2,
            status='Waiting',
            due_date=datetime.utcnow() + timedelta(days=2)
        )
        db.session.add_all([step3, step4])

        # High amount expense requiring additional approval
        exp3 = Expense(
            user_id=employee3.id,
            title='New Development Laptops',
            description='3 MacBook Pro for engineering team',
            amount=Decimal('6500.00'),
            currency='USD',
            category='Equipment',
            date=today,
            status='Pending',
            tags=json.dumps(['equipment', 'laptops', 'engineering'])
        )
        db.session.add(exp3)
        db.session.flush()
        
        step5 = ApprovalStep(
            expense_id=exp3.id,
            approver_id=manager1.id,
            sequence=1,
            status='Waiting'
        )
        step6 = ApprovalStep(
            expense_id=exp3.id,
            approver_id=admin.id,
            sequence=2,
            status='Waiting'
        )
        db.session.add_all([step5, step6])

        # Add comments
        comment1 = Comment(
            expense_id=exp2.id,
            user_id=manager2.id,
            content='This conference has excellent reviews. Good investment for our marketing team.'
        )
        db.session.add(comment1)

        # Create policies
        policies = [
            Policy(category='Meals', max_amount=Decimal('150.00'), requires_receipt=True, approval_threshold=Decimal('75.00')),
            Policy(category='Travel', max_amount=Decimal('1000.00'), requires_receipt=True, approval_threshold=Decimal('500.00')),
            Policy(category='Software', max_amount=Decimal('2000.00'), requires_receipt=False, approval_threshold=Decimal('1000.00')),
            Policy(category='Equipment', max_amount=Decimal('5000.00'), requires_receipt=True, approval_threshold=Decimal('2500.00')),
            Policy(category='Office Supplies', max_amount=Decimal('300.00'), requires_receipt=False, approval_threshold=Decimal('150.00'))
        ]
        db.session.add_all(policies)

        # Create notifications
        notifications = [
            Notification(
                user_id=admin.id,
                title='New Expense Submitted',
                message='Mike Johnson submitted a new expense for $120.00',
                type='info',
                related_expense_id=exp1.id
            ),
            Notification(
                user_id=manager2.id,
                title='Expense Approved',
                message='Your expense "Marketing Conference" was approved by Sarah Wilson',
                type='success',
                related_expense_id=exp2.id
            )
        ]
        db.session.add_all(notifications)
        
        db.session.commit()
        print("Database initialized with enhanced sample data!")

# Utility functions
def create_notification(user_id, title, message, type='info', expense_id=None):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        related_expense_id=expense_id
    )
    db.session.add(notification)

def check_policy_compliance(amount, category):
    policy = Policy.query.filter_by(category=category).first()
    if not policy:
        return {'compliant': True, 'message': ''}
    
    if amount > policy.max_amount:
        return {
            'compliant': False,
            'message': f'Amount exceeds ${policy.max_amount} limit for {category}'
        }
    
    if amount > policy.approval_threshold:
        return {
            'compliant': True,
            'message': f'Amount exceeds ${policy.approval_threshold} threshold, additional approval may be required'
        }
    
    return {'compliant': True, 'message': ''}

# Enhanced Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email'), password=data.get('password'), is_active=True).first()
    
    if not user:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    return jsonify({'success': True, 'user': user.to_dict()})

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    data = request.get_json()
    
    try:
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Check policy compliance
        compliance = check_policy_compliance(Decimal(str(data['amount'])), data.get('category', 'Other'))
        if not compliance['compliant']:
            return jsonify({'success': False, 'error': compliance['message']}), 400

        expense = Expense(
            user_id=data['user_id'],
            title=data['title'],
            description=data.get('description', ''),
            amount=Decimal(str(data['amount'])),
            currency=data.get('currency', 'USD'),
            category=data.get('category', 'Other'),
            date=datetime.strptime(data.get('date'), '%Y-%m-%d').date() if data.get('date') else datetime.utcnow().date(),
            status='Pending',
            tags=json.dumps(data.get('tags', []))
        )
        db.session.add(expense)
        db.session.flush()

        # Create dual approval steps with due dates
        approvers = []
        if user.manager:
            step1 = ApprovalStep(
                expense_id=expense.id,
                approver_id=user.manager.id,
                sequence=1,
                due_date=datetime.utcnow() + timedelta(days=3)
            )
            db.session.add(step1)
            approvers.append(user.manager)

        admin = User.query.filter_by(role='Admin').first()
        if admin:
            step2 = ApprovalStep(
                expense_id=expense.id,
                approver_id=admin.id,
                sequence=2,
                due_date=datetime.utcnow() + timedelta(days=5)
            )
            db.session.add(step2)
            approvers.append(admin)

        # Create notifications for approvers
        for approver in approvers:
            create_notification(
                approver.id,
                'Approval Required',
                f'New expense "{expense.title}" for ${expense.amount} requires your approval',
                'info',
                expense.id
            )

        # Notification for submitter
        create_notification(
            user.id,
            'Expense Submitted',
            f'Your expense "{expense.title}" has been submitted for approval',
            'success',
            expense.id
        )

        db.session.commit()
        return jsonify({
            'success': True, 
            'expense': expense.to_dict(include_steps=True),
            'policy_message': compliance['message']
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses/<int:expense_id>/comments', methods=['POST'])
def add_comment(expense_id):
    data = request.get_json()
    comment = Comment(
        expense_id=expense_id,
        user_id=data['user_id'],
        content=data['content']
    )
    db.session.add(comment)
    db.session.commit()
    
    # Notify relevant users
    expense = Expense.query.get(expense_id)
    create_notification(
        expense.user_id,
        'New Comment',
        f'New comment on your expense "{expense.title}"',
        'info',
        expense_id
    )
    
    return jsonify({'success': True, 'comment': comment.to_dict()})

@app.route('/api/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify({'success': True, 'notifications': [n.to_dict() for n in notifications]})

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    notification = Notification.query.get(notification_id)
    if notification:
        notification.is_read = True
        db.session.commit()
    return jsonify({'success': True})

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    total_expenses = Expense.query.count()
    pending_expenses = Expense.query.filter_by(status='Pending').count()
    approved_this_month = Expense.query.filter(
        Expense.status == 'Approved',
        Expense.submitted_at >= datetime.utcnow() - timedelta(days=30)
    ).count()
    
    total_amount = db.session.query(db.func.sum(Expense.amount)).filter_by(status='Approved').scalar() or 0
    monthly_amount = db.session.query(db.func.sum(Expense.amount)).filter(
        Expense.status == 'Approved',
        Expense.submitted_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar() or 0
    
    overdue_approvals = ApprovalStep.query.filter(
        ApprovalStep.status == 'Waiting',
        ApprovalStep.due_date < datetime.utcnow()
    ).count()
    
    return jsonify({
        'success': True,
        'stats': {
            'total_expenses': total_expenses,
            'pending_approvals': pending_expenses,
            'approved_this_month': approved_this_month,
            'total_amount': float(total_amount),
            'monthly_amount': float(monthly_amount),
            'overdue_approvals': overdue_approvals
        }
    })

@app.route('/api/expenses/search', methods=['GET'])
def search_expenses():
    query = request.args.get('q', '')
    category = request.args.get('category', '')
    status = request.args.get('status', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    
    expenses_query = Expense.query
    
    if query:
        expenses_query = expenses_query.filter(
            (Expense.title.ilike(f'%{query}%')) | 
            (Expense.description.ilike(f'%{query}%'))
        )
    
    if category:
        expenses_query = expenses_query.filter_by(category=category)
    
    if status:
        expenses_query = expenses_query.filter_by(status=status)
    
    if date_from:
        expenses_query = expenses_query.filter(Expense.date >= datetime.strptime(date_from, '%Y-%m-%d').date())
    
    if date_to:
        expenses_query = expenses_query.filter(Expense.date <= datetime.strptime(date_to, '%Y-%m-%d').date())
    
    expenses = expenses_query.order_by(Expense.submitted_at.desc()).all()
    return jsonify({'success': True, 'expenses': [exp.to_dict(include_steps=True) for exp in expenses]})

# Keep existing routes and add new ones...
@app.route('/api/approvals/<int:user_id>', methods=['GET'])
def get_approval_queue(user_id):
    steps = ApprovalStep.query.filter_by(approver_id=user_id, status='Waiting').all()
    expenses = [step.expense.to_dict(include_steps=True) for step in steps]
    return jsonify({'success': True, 'approvals': expenses})

@app.route('/api/approvals/<int:step_id>', methods=['PUT'])
def process_approval(step_id):
    data = request.get_json()
    step = ApprovalStep.query.get(step_id)
    
    if not step:
        return jsonify({'success': False, 'error': 'Approval step not found'}), 404
    
    if step.status != 'Waiting':
        return jsonify({'success': False, 'error': 'Already processed'}), 400
    
    decision = data.get('decision')
    step.status = 'Approved' if decision == 'approved' else 'Rejected'
    step.comments = data.get('comments', '')
    step.decided_at = datetime.utcnow()
    
    expense = step.expense
    
    if step.status == 'Rejected':
        expense.status = 'Rejected'
        ApprovalStep.query.filter_by(expense_id=expense.id, status='Waiting').update({'status': 'Skipped'})
        
        # Notify submitter
        create_notification(
            expense.user_id,
            'Expense Rejected',
            f'Your expense "{expense.title}" was rejected',
            'error',
            expense.id
        )
    else:
        pending = ApprovalStep.query.filter_by(expense_id=expense.id, status='Waiting').count()
        if pending == 0:
            expense.status = 'Approved'
            create_notification(
                expense.user_id,
                'Expense Approved',
                f'Your expense "{expense.title}" has been fully approved',
                'success',
                expense.id
            )
    
    db.session.commit()
    return jsonify({'success': True, 'expense': expense.to_dict(include_steps=True)})

@app.route('/api/expenses/history/<int:user_id>', methods=['GET'])
def get_expense_history(user_id):
    expenses = Expense.query.filter_by(user_id=user_id).order_by(Expense.submitted_at.desc()).all()
    return jsonify({'success': True, 'expenses': [exp.to_dict(include_steps=True) for exp in expenses]})

@app.route('/api/expenses/all', methods=['GET'])
def get_all_expenses():
    expenses = Expense.query.order_by(Expense.submitted_at.desc()).all()
    return jsonify({'success': True, 'expenses': [exp.to_dict(include_steps=True) for exp in expenses]})

@app.route('/api/expenses/team/<int:manager_id>', methods=['GET'])
def get_team_expenses(manager_id):
    team_members = User.query.filter_by(manager_id=manager_id).all()
    member_ids = [member.id for member in team_members]
    expenses = Expense.query.filter(Expense.user_id.in_(member_ids)).order_by(Expense.submitted_at.desc()).all()
    return jsonify({'success': True, 'expenses': [exp.to_dict(include_steps=True) for exp in expenses]})

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.filter_by(is_active=True).all()
    return jsonify({'success': True, 'users': [user.to_dict() for user in users]})

@app.route('/api/policies', methods=['GET'])
def get_policies():
    policies = Policy.query.all()
    return jsonify({'success': True, 'policies': [policy.to_dict() for policy in policies]})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API is running'})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    if path == '' or '.' not in path:
        return send_from_directory('static', 'index.html')
    return send_from_directory('static', path)

# Initialize database on startup
try:
    init_db()
except Exception as e:
    print(f"Error initializing database: {e}")

if __name__ == '__main__':
    app.run(debug=True, port=5000)