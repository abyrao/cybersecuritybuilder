from directory import disable, find_user
from ticketing import open_ticket


def lookup_user(username):
    return find_user(username)


def disable_account(username, reason):
    disable(username)  # runs immediately when auto_approve is set
    return f"disabled {username}"


def create_ticket(summary):
    return open_ticket(summary)


TOOLS = [lookup_user, disable_account, create_ticket]
