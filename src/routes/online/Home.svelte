<script lang="ts">
	import type { You } from '$lib';
	import { DbConnection, type ReducerEventContext, Room } from '../../module_bindings';
	import { onDestroy } from 'svelte';
	import { UseRooms } from './UseRooms.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		conn,
		you
	}: {
		conn: DbConnection;
		you: You;
	} = $props();

	let name = $state(you.name);
	$effect(() => {
		if (you.name) {
			name = you.name;
		}
	});
	let nameUpdating = $state(false);
	let nameEditing = $state(false);
	let creatingRoom = $state(false);

	const useRooms = new UseRooms(conn);
	export function stopUseRooms() {
		return useRooms.stop();
	}

	const onSetName = () => {
		nameUpdating = false;
		nameEditing = false;
		conn.reducers.removeOnSetName(onSetName);
	};

	let showPasswordModal = $state(false);
	let roomToJoin = $state<Room | null>(null);
	let passwordError = $state('');
	let joiningWithPassword = $state(false);

	function onNameSubmit(
		e: SubmitEvent & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) {
		e.preventDefault();
		const newName = new FormData(e.currentTarget).get('name') as string;
		if (!newName || newName === you.name) return;

		conn.reducers.onSetName(onSetName);
		conn.reducers.setName(newName);
		nameUpdating = true;
	}

	const onCreateRoom: (ctx: ReducerEventContext, title: string, password: string | undefined) => void = (ctx) => {
		if (ctx.event.status.tag === 'Failed') {
			console.error('Failed to create room:', ctx.event.status.value);
		}
		creatingRoom = false;
		conn.reducers.removeOnCreateRoom(onCreateRoom);
	};

	const onJoinToRoom: (ctx: ReducerEventContext, roomId: number, password: string | undefined) => void = (ctx) => {
		joiningWithPassword = false;
		if (ctx.event.status.tag === 'Failed') {
			const errorMessage = ctx.event.status.value;
			if (errorMessage.includes('Incorrect password')) {
				// Show error in password modal
				passwordError = m.incorrect_password();
			} else {
				// Other errors - show in console and close modal
				passwordError = errorMessage;
				console.error('Failed to join room:', errorMessage);
				resetPasswordModal();
			}
		} else {
			// Successfully joined room
			resetPasswordModal();
		}
		conn.reducers.removeOnJoinToRoom(onJoinToRoom);
	};

	function createRoom(event: SubmitEvent) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const title = (formData.get('title') as string)?.trim() || (you.name ?? '???');
		const password = (formData.get('password') as string)?.trim() || undefined;
		
		creatingRoom = true;
		conn.reducers.createRoom(title, password);
		conn.reducers.onCreateRoom(onCreateRoom);
	}

	function joinRoom(room: Room) {
		if (room.hasPassword) {
			// Show password prompt modal
			showPasswordModal = true;
			roomToJoin = room;
		} else {
			roomToJoin = room;
			conn.reducers.onJoinToRoom(onJoinToRoom);
			conn.reducers.joinToRoom(room.id, undefined);
		}
	}

	function joinRoomWithPassword(event: SubmitEvent) {
		event.preventDefault();
		if (!roomToJoin) return;
		
		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const password = (formData.get('password') as string)?.trim();
		if (!password) return;
		
		passwordError = '';
		joiningWithPassword = true;
		conn.reducers.onJoinToRoom(onJoinToRoom);
		conn.reducers.joinToRoom(roomToJoin.id, password);
	}

	function cancelPasswordJoin() {
		showPasswordModal = false;
		passwordError = '';
		roomToJoin = null;
		joiningWithPassword = false;
	}
	
	function resetPasswordModal() {
		showPasswordModal = false;
		passwordError = '';
		roomToJoin = null;
		joiningWithPassword = false;
	}

	onDestroy(async () => {
		conn.reducers.removeOnSetName(onSetName);
		conn.reducers.removeOnCreateRoom(onCreateRoom);
		conn.reducers.removeOnJoinToRoom(onJoinToRoom);
	});
</script>

{#snippet nameInputForm()}
	<form onsubmit={onNameSubmit} class="flex flex-col gap-4">
		<input
			class="input"
			name="name"
			type="text"
			placeholder={m.legal_cool_dolphin_cry()}
			bind:value={name}
			disabled={nameUpdating}
		/>
		<button type="submit" class="btn btn-primary">
			{#if nameUpdating}
				<span class="loading loading-spinner loading-md"></span>
			{:else}
				{m.save()}
			{/if}
		</button>
	</form>
{/snippet}

<div class="flex flex-col gap-4 text-center">
	{#if you.name}
		<div class="flex items-center justify-center gap-2">
			<h1>{m.awake_acidic_deer_swim()}<span class="font-bold">{you.name}</span>!</h1>
			<button
				onclick={() => {
					nameEditing = !nameEditing;
				}}
				class="btn btn-xs">{nameEditing ? m.cancel() : m.edit()}</button
			>
		</div>
	{/if}
	{#if !you.name}
		{@render nameInputForm()}
	{:else if nameEditing}
		{@render nameInputForm()}
	{/if}
	{#if you.name}
		<div class="space-y-4">
			<div>
				<form
					onsubmit={createRoom}
					class="dropdown dropdown-hover dropdown-center"
				>
					<button type="submit" class="btn btn-primary" disabled={creatingRoom}
						>{m.great_suave_dolphin_achieve()}{#if creatingRoom}
							<span class="loading loading-spinner loading-md"></span>
						{/if}</button
					>
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div
						tabindex="0"
						class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm space-y-2"
					>
						<input
							type="text"
							name="title"
							placeholder={m.room_name()}
							class="input input-bordered w-full max-w-xs"
						/>
						<input
							type="password"
							name="password"
							placeholder={m.password_optional()}
							class="input input-bordered w-full max-w-xs"
						/>
					</div>
				</form>
			</div>

			<a href="/online/leaderboard" class="btn btn-outline btn-secondary btn-sm"
				>🏅 {m.just_maroon_insect_soar()}</a
			>

			<div class={useRooms.rooms ? 'space-y-2' : 'hidden'}>
				<h2>{m.actual_gray_scallop_sway()} ({useRooms.rooms.length})</h2>
				<ol class="space-y-1">
					{#each useRooms.rooms as room (room.id)}
						<li class="">
							<button
								class="btn btn-sm"
								onclick={() => joinRoom(room)}
							>
								{room.title}
								{#if room.hasPassword}
									<span class="text-xs">🔒</span>
								{/if}
							</button>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	{/if}
</div>

<!-- Password Modal -->
{#if showPasswordModal && roomToJoin}
	<dialog class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg">{m.enter_room_password()}</h3>
			<p class="py-4">{m.room_requires_password({ title: roomToJoin.title })}</p>
			<form
				onsubmit={joinRoomWithPassword}
				class="space-y-4"
			>
				<input
					type="password"
					name="password"
					placeholder={m.enter_password_placeholder()}
					class="input input-bordered w-full {passwordError ? 'input-error' : ''}"
					disabled={joiningWithPassword}
				/>
				{#if passwordError}
					<p class="text-error text-sm">{passwordError}</p>
				{/if}
				<div class="modal-action">
					<button type="button" class="btn" onclick={cancelPasswordJoin} disabled={joiningWithPassword}>{m.cancel()}</button>
					<button type="submit" class="btn btn-primary" disabled={joiningWithPassword}>
						{#if joiningWithPassword}
							<span class="loading loading-spinner loading-sm"></span>
							{m.joining()}
						{:else}
							{m.join_room()}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</dialog>
{/if}
