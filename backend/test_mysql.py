import pymysql

try:
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='Harshit5830T'  # Use the password you set during MySQL installation
    )
    print("✅ Connected to MySQL!")
    
    # Try to create database and user
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS expense_manager")
        cursor.execute("CREATE USER IF NOT EXISTS 'expense_user'@'localhost' IDENTIFIED BY 'secure_password_123'")
        cursor.execute("GRANT ALL PRIVILEGES ON expense_manager.* TO 'expense_user'@'localhost'")
        cursor.execute("FLUSH PRIVILEGES")
        print("✅ Database and user created!")
    
    connection.close()
    
except Exception as e:
    print(f"❌ Error: {e}")