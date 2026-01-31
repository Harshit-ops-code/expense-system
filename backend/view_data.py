from app import app, db, User, Expense, ApprovalStep, Comment, Policy, Notification

def view_all_data():
    with app.app_context():
        print("=" * 60)
        print("📊 EXPENSE MANAGER - ALL DATA")
        print("=" * 60)
        
        # Users
        users = User.query.all()
        print(f"\n👥 USERS ({len(users)}):")
        for user in users:
            print(f"  {user.id}: {user.name} ({user.email}) - {user.role} - {user.department}")
        
        # Expenses
        expenses = Expense.query.all()
        print(f"\n💰 EXPENSES ({len(expenses)}):")
        for exp in expenses:
            print(f"  {exp.id}: {exp.title} - ${exp.amount} - {exp.status} - {exp.category}")
        
        # Approval Steps
        steps = ApprovalStep.query.all()
        print(f"\n✅ APPROVAL STEPS ({len(steps)}):")
        for step in steps:
            print(f"  Expense {step.expense_id}: Step {step.sequence} - {step.status} - Approver: {step.approver.name}")
        
        # Policies
        policies = Policy.query.all()
        print(f"\n📋 POLICIES ({len(policies)}):")
        for policy in policies:
            print(f"  {policy.category}: Max ${policy.max_amount}, Threshold ${policy.approval_threshold}")
        
        # Notifications
        notifications = Notification.query.all()
        print(f"\n🔔 NOTIFICATIONS ({len(notifications)}):")
        for notif in notifications:
            print(f"  {notif.title}: {notif.message}")
        
        print("=" * 60)

if __name__ == '__main__':
    view_all_data()