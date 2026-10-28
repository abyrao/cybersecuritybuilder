import logging

import guardrails
from llm import generate
from retriever import retrieve
from settings import CONFIG, SYSTEM

log = logging.getLogger("policypal")


def answer(user, question):
    context = retrieve(question)
    prompt = SYSTEM.format(first_name=user.first_name, context=context)
    prompt += "\nQuestion: " + question
    log.info(f"user={user.email} prompt={prompt}")
    reply = generate(prompt, temperature=CONFIG.model.temperature)
    return guardrails.check_output(reply)
